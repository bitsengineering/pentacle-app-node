// types
import { EventEmitter } from "events";
// func
import { pseudoRandomBytes } from "crypto";
import { createDecodeStream, createEncodeStream } from "bitcoin-protocol";

// class
import { Socket } from "net";

// lib
import { Header, Message, Opts, PeerParams, PayloadReference, PingPong, Transaction, GetHeadersParam, VersionParams } from "../model";

// helper funcs.
import { getServices } from "./utils";

//constants
import { BLOOMSERVICE_VERSION, DEFAULT_TIMEOUT, INITIAL_PING_INTERVAL, INITIAL_PING_N, nullHash, SERVICES_FULL, SERVICES_SPV } from "./constants";

export class PeerBase extends EventEmitter {
  params: PeerParams;
  protocolVersion: number; // The highest protocol version understood by the transmitting node.
  minimumVersion: number;
  requireBloom?: boolean;
  userAgent?: string;
  handshakeTimeout: number;
  startHeigh: number;
  relay: boolean;
  pingInterval: number;
  version: number | null | VersionParams;
  services: { [key: string]: boolean } | null;
  socket: Socket | null;
  _handshakeTimeout: NodeJS.Timeout | null;
  disconnected: boolean;
  encoder: any;
  decoder: any;
  _pingInterval?: NodeJS.Timeout;
  ready?: boolean;
  verack: boolean;

  constructor(params: PeerParams, opts: Opts) {
    super();

    this.params = params;
    this.protocolVersion = params.protocolVersion || 70012;
    this.minimumVersion = params.minimumVersion || 70001;
    this.requireBloom = opts.requireBloom && true;
    this.userAgent = opts.userAgent || `/node.js:${process.versions.node}/pentacle-app-node":1.0.0/`;
    this.handshakeTimeout = opts.handshakeTimeout || 8 * 1000;
    this.startHeigh = opts.startHeigh || 0;
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

  emit(eventName: string | symbol, ...args: any[]) {
    console.log("emitlog", eventName, ...args);
    return super.emit(eventName, ...args);
  }

  send<T>(command: string, eventNames?: Array<string>, payload?: PayloadReference, timeout: number = DEFAULT_TIMEOUT): Promise<Array<T>> {
    if (!["ping", "pong", "version", "verack"].includes(command)) console.log("send", command, eventNames, payload);
    return new Promise<Array<T>>((resolve, reject) => {
      if (!this.socket?.writable) reject(new Error(`socket is not writable ${command}`));

      if (!this.encoder) reject(new Error("Encoder is undefined"));

      if (this.encoder) {
        if (eventNames && eventNames.length > 0) {
          let nodejsTimeout: NodeJS.Timeout = setTimeout(() => {
            // debug(`${command} timed out: ${timeout} ms`);
            if (eventNames && eventNames.length > 0) {
              eventNames.forEach((eventName: string) => {
                this.removeListener(eventName, resolve);
              });
            }
            const error = new Error("Request timed out");
            reject(error);
          }, timeout);

          this.registerOnceMulti<T>(eventNames).then((ts: Array<T>) => {
            // console.log("this.once nodejsTimeout", command, eventNames, timeout);
            clearTimeout(nodejsTimeout);
            resolve(ts);
          });

          // this.once(eventName, (t: T) => {
          //   console.log("this.once nodejsTimeout", command, eventName, timeout);
          //   clearTimeout(nodejsTimeout);
          //   resolve(t);
          // });
        }

        this.encoder.write({ command, payload });
      }
    });
  }

  registerOnceMono<T>(eventName: string): Promise<T> {
    if (eventName !== "pong") console.log("registerOnceMono registered.", eventName);

    return new Promise((resolve) => {
      this.once(eventName, (t: T) => {
        if (eventName !== "pong") console.log("registerOnceMono resolved.", eventName);
        resolve(t);
      });
    });
  }

  async registerOnceMulti<T>(eventNames: Array<string>): Promise<Array<T>> {
    if (!eventNames.includes("pong")) console.log("registerOnceMulti registered", eventNames);

    const promises: Array<Promise<T>> = [];
    eventNames.forEach((eventName: string) => {
      const promise = new Promise<T>((resolve) => {
        return this.registerOnceMono<T>(eventName).then((t: T) => {
          resolve(t);
        });
      });
      promises.push(promise);
    });
    const ts = await Promise.all<T>(promises);
    if (!eventNames.includes("pong")) console.log("registerOnceMulti promise all resolved.", ts.length);
    return ts;
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

    this.decoder = createDecodeStream(protocolOpts);
    this.decoder.on("error", this._error.bind(this));
    socket.pipe(this.decoder);

    this.encoder = createEncodeStream(protocolOpts);
    this.encoder.pipe(socket);

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
          // console.warn(error.message);
        });
      }, this.pingInterval) as unknown as NodeJS.Timeout;

      for (let i = 0; i < INITIAL_PING_N; i++) {
        setTimeout(() => {
          this.ping().catch((error: Error) => {
            // console.warn(error.message);
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

  async ping(): Promise<PingPong> {
    // const start = Date.now();
    const nonce = pseudoRandomBytes(8);
    const onPong = (pong: PingPong) => {
      if (pong.nonce.compare(nonce) !== 0) throw new Error("pong.nonce is different");
      // console.log("ping elapsed ", Date.now() - start);
      return pong;
    };
    const pongs = await this.send<PingPong>("ping", ["pong"], { nonce });
    return onPong(pongs[0]);
  }

  _error(err: Error) {
    this.emit("error", err);
    this.disconnect(err);
  }

  _registerListeners() {
    if (this.decoder) {
      this.decoder.on("data", (message: Message) => {
        this.emit("message", message);
        this.emit(message.command, message.payload);
      });
      this.decoder.on("error", this._error.bind(this));
    }

    if (this.encoder) this.encoder.on("error", this._error.bind(this));

    this.on("version", this._onVersion);

    this.on("verack", () => {
      if (this.ready) return this._error(new Error("Got duplicate verack"));
      this.verack = true;
      this._maybeReady();
    });

    this.on("ping", (message) => this.send("pong", undefined, message));

    /* this.on("block", (block) => {
      this.emit(`block:${hashBlock(block.header)}`, block);
    });
    this.on("merkleblock", (block) => {
      this.emit(`merkleblock:${hashBlock(block.header)}`, block);
    });
    this.on("tx", (tx) => {
      this.emit(`tx:${hashTx(tx)}`, tx);
    }); */
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
      services: SERVICES_SPV, // Services: NODE_NETWORK
      timestamp: Math.round(Date.now() / 1000), // [Epoch time][unix epoch time]: 1415483324
      receiverAddress: {
        services: SERVICES_FULL, // Receiving node's services
        address: this.socket?.remoteAddress || "0.0.0.0", // Receiving node's IPv6 address
        port: this.socket?.remotePort || 0, // Receiving node's port number
      },
      senderAddress: {
        services: SERVICES_SPV, // Transmitting node's services
        address: "0.0.0.0", // Transmitting node's IPv6 address
        port: this.socket?.localPort || 0, // Transmitting node's port number
      },
      nonce: pseudoRandomBytes(8),
      userAgent: this.userAgent, // Bytes in user agent string
      startHeight: this.startHeigh,
      relay: this.relay,
    };
    this.send("version", undefined, versionParams);
  }
}
