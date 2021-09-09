// types
import { Transform } from "stream";
import { EventEmitter } from "events";
// func
import { obj } from "through2";
import { pseudoRandomBytes } from "crypto";
import { createDecodeStream, createEncodeStream } from "bitcoin-protocol";

import Debug from "debug";
// class
import { Socket } from "net";

// lib
import { INVENTORY } from "./enum";
import { Block, Header, Message, Opts, PeerParams, PayloadReference, PingPong, ServiceBit, Transaction, GetHeadersParam, VersionParams } from "../model";
import { hashBlock, hashTx } from "./utils";

const wrapEvents = require("event-cleanup");
const debug = Debug("bitcoin-net:peer");
const rx = Debug("bitcoin-net:messages:rx");
const tx = Debug("bitcoin-net:messages:tx");

const SERVICES_SPV: Buffer = Buffer.from("0800000000000000", "hex");
const SERVICES_FULL: Buffer = Buffer.from("0100000000000000", "hex");
const BLOOMSERVICE_VERSION: number = 70011;

const INITIAL_PING_N: number = 4; // send this many pings when we first connect
const INITIAL_PING_INTERVAL: number = 250; // wait this many ms between initial pings
const MIN_TIMEOUT: number = 4000; // lower bound for timeouts (in case latency is low)

const LATENCY: number = 2 * 1000;
const DEFAULT_TIMEOUT: number = MIN_TIMEOUT + LATENCY * 10;
const nullHash = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");

const serviceBits: Array<ServiceBit> = [
  { key: "NODE_NETWORK", value: 0 },
  { key: "NODE_GETUTXO", value: 1 },
  { key: "NODE_BLOOM", value: 2 },
  { key: "NODE_WITNESS", value: 3 },
  { key: "NODE_NETWORK_LIMITED", value: 10 },
];

// type Services = {
//   NODE_NETWORK: boolean;
//   NODE_BLOOM: boolean;
//   NODE_WITNESS: boolean;
//   NODE_NETWORK_LIMITED: boolean;
// }

const getServices = (buf: Buffer) => {
  const services: { [key: string]: boolean } = {};
  serviceBits.forEach((sr: ServiceBit) => {
    const byteIndex = Math.floor(sr.value / 8);
    const byte = buf.readUInt32LE(byteIndex);
    const bitIndex = sr.value % 8;
    if (byte & (1 << bitIndex)) {
      services[sr.key] = true;
    }
  });
  return services;
};

const debugStream = (f: (message: string) => void) =>
  obj((message: string, enc: any, cb: (err: Error | null, message: string) => void) => {
    f(message);
    cb(null, message);
  });

export class Peer extends EventEmitter {
  params: PeerParams;
  protocolVersion: number;
  minimumVersion: number;
  requireBloom?: boolean;
  userAgent?: string;
  handshakeTimeout: number;
  getTip?: () => { height: number };
  relay: boolean;
  pingInterval: number;
  version: number | null | VersionParams;
  services: { [key: string]: boolean } | null;
  socket: Socket | null;
  _handshakeTimeout: NodeJS.Timeout | null;
  disconnected: boolean;
  private _encoder: Transform | undefined;
  private _decoder: Transform | undefined;
  _pingInterval?: NodeJS.Timeout;
  ready?: boolean;
  verack: boolean;

  constructor(params: PeerParams, opts: Opts) {
    super();

    this.params = params;
    this.protocolVersion = params.protocolVersion || 70012;
    this.minimumVersion = params.minimumVersion || 70001;
    this.requireBloom = opts.requireBloom && true;
    this.userAgent = opts.userAgent;
    if (!opts.userAgent) {
      if ((process as NodeJS.Process).browser) this.userAgent = `/${navigator.userAgent}/`;
      else this.userAgent = `/node.js:${process.versions.node}/`;
      this.userAgent += `pentacle-app-node":1.0.0/`;
    }
    if (opts.subUserAgent) this.userAgent += opts.subUserAgent;
    this.handshakeTimeout = opts.handshakeTimeout || 8 * 1000;
    this.getTip = opts.getTip;
    this.relay = opts.relay || false;
    this.pingInterval = opts.pingInterval || 15 * 1000;
    this.version = null;
    this.services = null;
    this.socket = null;
    this.relay = false;
    this._handshakeTimeout = null;
    this.disconnected = false;

    this.verack = false;

    this._pingInterval = undefined;

    this.setMaxListeners(200);

    if (opts.socket) this.connect(opts.socket);
  }

  send<T>(command: string, eventNames?: Array<string>, payload?: PayloadReference, timeout: number = DEFAULT_TIMEOUT): Promise<Array<T>> {
    return new Promise<Array<T>>((resolve, reject) => {
      if (!this.socket?.writable) reject(new Error(`socket is not writable ${command}`));

      if (!this._encoder) reject(new Error("Encoder is undefined"));

      if (this._encoder) {
        if (eventNames && eventNames.length > 0) {
          let nodejsTimeout: NodeJS.Timeout = setTimeout(() => {
            debug(`${command} timed out: ${timeout} ms`);
            if (eventNames && eventNames.length > 0) {
              eventNames.forEach((eventName: string) => {
                this.removeListener(eventName, resolve);
              });
            }
            const error = new Error("Request timed out");
            reject(error);
          }, timeout);

          this.registerOnceMulti<T>(eventNames).then((ts: Array<T>) => {
            console.log("this.once nodejsTimeout", command, eventNames, timeout);
            clearTimeout(nodejsTimeout);
            resolve(ts);
          });

          // this.once(eventName, (t: T) => {
          //   console.log("this.once nodejsTimeout", command, eventName, timeout);
          //   clearTimeout(nodejsTimeout);
          //   resolve(t);
          // });
        }

        this._encoder.write({ command, payload });
      }
    });
  }

  registerOnceMono<T>(eventName: string): Promise<T> {
    return new Promise((resolve) => {
      this.once(eventName, (t: T) => {
        console.log("register once", eventName);
        resolve(t);
      });
    });
  }

  registerOnceMulti<T>(eventNames: Array<string>): Promise<Array<T>> {
    const promises: Array<Promise<T>> = [];
    eventNames.forEach((eventName: string) => {
      const promise = new Promise<T>((resolve) => {
        return this.registerOnceMono<T>(eventName).then((t: T) => {
          console.log("register once", eventName);
          resolve(t);
        });
      });
      promises.push(promise);
    });
    return Promise.all<T>(promises).then((ts: Array<T>) => {
      console.log("Promise all resolved", ts.length);
      return ts;
    });
  }

  connect(socket: Socket) {
    if (!socket || !socket.readable || !socket.writable) {
      throw new Error("Must specify socket duplex stream");
    }
    this.socket = socket;
    socket.once("close", () => {
      this.disconnect(new Error("Socket closed"));
    });
    socket.on("error", this._error.bind(this));

    const protocolOpts = {
      magic: this.params.magic,
      messages: this.params.messages,
    };

    const decoder = createDecodeStream(protocolOpts);
    decoder.on("error", this._error.bind(this));
    this._decoder = debugStream(rx);
    socket.pipe(decoder).pipe(this._decoder);

    this._encoder = debugStream(tx);
    const encoder = createEncodeStream(protocolOpts);
    this._encoder.pipe(encoder).pipe(socket);

    // timeout if handshake doesn't finish fast enough
    if (this.handshakeTimeout) {
      this._handshakeTimeout = setTimeout(() => {
        this._handshakeTimeout = null;
        this._error(new Error("Peer handshake timed out"));
      }, this.handshakeTimeout);
      this.once("ready", () => {
        if (this._handshakeTimeout) clearTimeout(this._handshakeTimeout);
        this._handshakeTimeout = null;
      });
    }

    // set up ping interval and initial pings
    this.once("ready", () => {
      this._pingInterval = setInterval(() => {
        this.ping().catch((error: Error) => {
          console.warn(error.message);
        });
      }, this.pingInterval) as unknown as NodeJS.Timeout;

      for (let i = 0; i < INITIAL_PING_N; i++) {
        setTimeout(() => {
          this.ping().catch((error: Error) => {
            console.warn(error.message);
          });
        }, INITIAL_PING_INTERVAL * i);
      }
    });

    this._registerListeners();
    this._sendVersion();
  }

  disconnect(err?: Error) {
    if (this.disconnected) return;
    this.disconnected = true;
    if (this._handshakeTimeout) clearTimeout(this._handshakeTimeout);
    clearInterval(undefined);
    this.socket?.end();
    this.emit("disconnect", err);
  }

  ping(): Promise<PingPong> {
    // const start = Date.now();
    const nonce = pseudoRandomBytes(8);
    const onPong = (pong: PingPong) => {
      if (pong.nonce.compare(nonce) !== 0) throw new Error("pong.nonce is different");
      // console.log("ping elapsed ", Date.now() - start);
      return pong;
    };
    return this.send<PingPong>("ping", ["pong"], { nonce }).then((pongs: Array<PingPong>) => onPong(pongs[0]));
  }

  _error(err: Error) {
    this.emit("error", err);
    this.disconnect(err);
  }

  _registerListeners() {
    if (this._decoder) {
      this._decoder.on("data", (message: Message) => {
        this.emit("message", message);
        this.emit(message.command, message.payload);
      });
      this._decoder.on("error", this._error.bind(this));
    }

    if (this._encoder) this._encoder.on("error", this._error.bind(this));

    this.on("version", this._onVersion);
    this.on("verack", () => {
      if (this.ready) return this._error(new Error("Got duplicate verack"));
      this.verack = true;
      this._maybeReady();
    });

    this.on("ping", (message) => this.send("pong", undefined, message));

    this.on("block", (block) => {
      this.emit(`block:${hashBlock(block.header)}`, block);
    });
    this.on("merkleblock", (block) => {
      this.emit(`merkleblock:${hashBlock(block.header)}`, block);
    });
    this.on("tx", (tx) => {
      this.emit(`tx:${hashTx(tx)}`, tx);
    });
  }

  _onVersion(message: VersionParams) {
    this.services = getServices(message.services);

    if (!this.services.NODE_NETWORK) {
      return this._error(new Error("Node does not provide NODE_NETWORK service"));
    }
    this.version = message;
    if (message.version < this.minimumVersion) {
      return this._error(new Error("Peer is using an incompatible protocol version: " + `required: >= ${this.minimumVersion}, actual: ${message.version}`));
    }
    if (this.requireBloom && message.version >= BLOOMSERVICE_VERSION && !this.services.NODE_BLOOM) {
      return this._error(new Error("Node does not provide NODE_BLOOM service"));
    }
    this.send("verack");
    this._maybeReady();
  }

  _maybeReady() {
    if (!this.verack || !this.version) return;
    this.ready = true;
    this.emit("ready");
  }

  readyOnce() {
    return this.registerOnceMulti(["ready"]);
  }

  _sendVersion() {
    const versionParams: VersionParams = {
      version: this.protocolVersion,
      services: SERVICES_SPV,
      timestamp: Math.round(Date.now() / 1000),
      receiverAddress: {
        services: SERVICES_FULL,
        address: this.socket?.remoteAddress || "0.0.0.0",
        port: this.socket?.remotePort || 0,
      },
      senderAddress: {
        services: SERVICES_SPV,
        address: "0.0.0.0",
        port: this.socket?.localPort || 0,
      },
      nonce: pseudoRandomBytes(8),
      userAgent: this.userAgent,
      startHeight: this.getTip ? this.getTip().height : 0,
      relay: this.relay,
    };
    this.send("version", undefined, versionParams);
  }

  getHeaders(locator: Array<Buffer>, opts: Opts = {}): Promise<Array<Array<Header>>> {
    const getHeadersParams: GetHeadersParam = {
      version: this.protocolVersion,
      locator,
      hashStop: opts.stop || nullHash,
    };

    return this.send<Array<Header>>("getheaders", ["headers"], getHeadersParams, opts.timeout);
    // then((headerses: Array<Array<Header>>) => headerses[0]);
  }
}
