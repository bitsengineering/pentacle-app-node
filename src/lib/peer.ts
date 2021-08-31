import { pseudoRandomBytes } from "crypto";
import {
  constants,
  createDecodeStream,
  createEncodeStream,
} from "bitcoin-protocol";
import * as through2 from "through2";
import { assertParams, getBlockHash, getTxHash } from "./utils";
import { EventEmitter } from "events";
import Debug from "debug";
import * as internal from "stream";
import {
  Block,
  Header,
  Message,
  Opts,
  Params,
  PayloadReference,
  PingPong,
  ServiceBit,
  Transaction,
  Version,
} from "../model";
import { Socket } from "net";

const wrapEvents = require("event-cleanup");
const debug = Debug("bitcoin-net:peer");
const rx = Debug("bitcoin-net:messages:rx");
const tx = Debug("bitcoin-net:messages:tx");

const INV = constants.inventory;
const SERVICES_SPV: Buffer = Buffer.from("0800000000000000", "hex");
const SERVICES_FULL: Buffer = Buffer.from("0100000000000000", "hex");
const BLOOMSERVICE_VERSION: number = 70011;

const LATENCY_EXP: number = 0.5; // coefficient used for latency exponential average
const INITIAL_PING_N: number = 4; // send this many pings when we first connect
const INITIAL_PING_INTERVAL: number = 250; // wait this many ms between initial pings
const MIN_TIMEOUT: number = 4000; // lower bound for timeouts (in case latency is low)
const nullHash = Buffer.from(
  "0000000000000000000000000000000000000000000000000000000000000000",
  "hex"
);

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
  const services: any = {};
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
  through2.obj(
    (
      message: string,
      enc: any,
      cb: (err: Error | null, message: string) => void
    ) => {
      f(message);
      cb(null, message);
    }
  );

export class Peer extends EventEmitter {
  params: Params;
  protocolVersion: number;
  minimumVersion: number;
  requireBloom?: boolean;
  userAgent?: string;
  handshakeTimeout: number;
  getTip: any;
  relay: boolean;
  pingInterval: any;
  version: number | null | Version;
  services: any | null;
  socket: Socket | null;
  _handshakeTimeout: NodeJS.Timeout | null;
  disconnected: boolean;
  latency: number;
  getHeadersQueue: Array<{
    locator: Array<Buffer>;
    opts: Opts;
    cb: (_err: Error | null, headers?: Array<Header>) => void;
  }>;
  gettingHeaders: boolean;
  private _encoder: internal.Transform | undefined;
  private _decoder: internal.Transform | undefined;
  _pingInterval?: any;
  ready?: boolean;
  verack: boolean;

  constructor(params: Params, opts: Opts) {
    assertParams(params);

    super();

    this.params = params;
    this.protocolVersion = params.protocolVersion || 70012;
    this.minimumVersion = params.minimumVersion || 70001;
    this.requireBloom = opts.requireBloom && true;
    this.userAgent = opts.userAgent;
    if (!opts.userAgent) {
      if ((process as NodeJS.Process).browser)
        this.userAgent = `/${navigator.userAgent}/`;
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
    this.latency = 2 * 1000; // default to 2s

    this.getHeadersQueue = [];
    this.gettingHeaders = false;
    this.verack = false;

    this._pingInterval = undefined;

    this.setMaxListeners(200);

    if (opts.socket) this.connect(opts.socket);
  }

  send(command: string, payload?: PayloadReference) {
    console.log("command", command);
    console.log("payload", payload);
    // TODO?: maybe this should error if we try to write after close?
    if (!this.socket?.writable) return;
    if (this._encoder) this._encoder.write({ command, payload });
  }

  connect(socket: any) {
    console.log("socket", typeof socket);
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
      this._pingInterval = setInterval(this.ping.bind(this), this.pingInterval);
      for (let i = 0; i < INITIAL_PING_N; i++) {
        setTimeout(this.ping.bind(this), INITIAL_PING_INTERVAL * i);
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

  ping(cb: (err: Error | null, elapsed: number, latency: number) => void) {
    const start = Date.now();
    const nonce = pseudoRandomBytes(8);
    const onPong = (pong: PingPong) => {
      if (pong.nonce.compare(nonce) !== 0) return;
      this.removeListener("pong", onPong);
      const elapsed = Date.now() - start;
      this.latency = this.latency * LATENCY_EXP + elapsed * (1 - LATENCY_EXP);
      if (cb) cb(null, elapsed, this.latency);
    };
    this.on("pong", onPong);
    this.send("ping", { nonce });
  }

  _error(err: Error) {
    this.emit("error", err);
    this.disconnect(err);
  }

  _registerListeners() {
    if (this._decoder) this._decoder.on("error", this._error.bind(this));
    if (this._decoder)
      this._decoder.on("data", (message: Message) => {
        this.emit("message", message);
        this.emit(message.command, message.payload);
      });

    if (this._encoder) this._encoder.on("error", this._error.bind(this));

    this.on("version", this._onVersion);
    this.on("verack", () => {
      if (this.ready) return this._error(new Error("Got duplicate verack"));
      this.verack = true;
      this._maybeReady();
    });

    this.on("ping", (message) => this.send("pong", message));

    this.on("block", (block) => {
      this.emit(
        `block:${getBlockHash(block.header).toString("base64")}`,
        block
      );
    });
    this.on("merkleblock", (block) => {
      this.emit(
        `merkleblock:${getBlockHash(block.header).toString("base64")}`,
        block
      );
    });
    this.on("tx", (tx) => {
      this.emit(`tx:${getTxHash(tx).toString("base64")}`, tx);
    });
  }

  _onVersion(message: Version) {
    console.log("messagexxxx", message);
    this.services = getServices(message.services);

    if (!this.services.NODE_NETWORK) {
      return this._error(
        new Error("Node does not provide NODE_NETWORK service")
      );
    }
    this.version = message;
    if (message.version < this.minimumVersion) {
      return this._error(
        new Error(
          "Peer is using an incompatible protocol version: " +
            `required: >= ${this.minimumVersion}, actual: ${message.version}`
        )
      );
    }
    if (
      this.requireBloom &&
      message.version >= BLOOMSERVICE_VERSION &&
      !this.services.NODE_BLOOM
    ) {
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

  _onceReady(cb: (...args: any[]) => void) {
    if (this.ready) return cb();
    this.once("ready", cb);
  }

  _sendVersion() {
    this.send("version", {
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
    });
  }

  _getTimeout() {
    return MIN_TIMEOUT + this.latency * 10;
  }

  getBlocks(
    hashes: Array<Buffer>,
    opts: Opts,
    cb: (_err: Error | null, blocks?: Array<Block>) => void
  ) {
    if (typeof opts === "function") {
      cb = opts;
      opts = {};
    }
    if (opts.timeout == null) opts.timeout = this._getTimeout();

    let timeout: NodeJS.Timeout;
    const events = wrapEvents(this);
    const output = new Array(hashes.length);
    let remaining = hashes.length;
    hashes.forEach((hash: Buffer, i: number) => {
      const event = `${opts.filtered ? "merkle" : ""}block:${hash.toString(
        "base64"
      )}`;

      events.once(event, (block: Block) => {
        output[i] = block;
        remaining--;
        if (remaining > 0) return;
        if (timeout != null) clearTimeout(timeout);
        cb(null, output);
      });
    });

    const inventory: Array<{ type: number; hash: Buffer }> = hashes.map(
      (hash: Buffer) => ({
        type: opts.filtered ? INV.MSG_FILTERED_BLOCK : INV.MSG_BLOCK,
        hash,
      })
    );
    this.send("getdata", inventory);

    if (!opts.timeout) return;
    timeout = setTimeout(() => {
      debug(
        `getBlocks timed out: ${opts.timeout} ms, remaining: ${remaining}/${hashes.length}`
      );
      events.removeAll();
      const error = new Error("Request timed out");
      // error.timeout = true;
      cb(error);
    }, opts.timeout);
  }

  getTransactions(
    blockHash: Buffer | null,
    txids: Array<Buffer>,
    opts: Opts,
    cb: (err: Error | null, transactions?: Array<Transaction>) => void
  ) {
    // if (Array.isArray(blockHash)) {
    //   cb = opts;
    //   opts = txids;
    //   txids = blockHash;
    //   blockHash = null;
    // }
    if (typeof opts === "function") {
      cb = opts;
      opts = {};
    }

    const output = new Array(txids.length);

    if (blockHash) {
      const txIndex: any = {};
      txids.forEach((txid: Buffer, i: number) => {
        txIndex[txid.toString("base64")] = i;
      });
      this.getBlocks([blockHash], opts, (err: Error | null, blocks: any) => {
        if (err) return cb(err);
        for (let tx of blocks[0].transactions) {
          const id = getTxHash(tx).toString("base64");
          const i = txIndex[id];
          if (i == null) continue;
          delete txIndex[id];
          output[i] = tx;
        }
        cb(null, output);
      });
    } else {
      if (opts.timeout == null) opts.timeout = this._getTimeout();
      // TODO: make a function for all these similar timeout request methods

      let timeout: NodeJS.Timeout;
      let remaining = txids.length;
      const events = wrapEvents(this);
      txids.forEach((txid: Buffer, i: number) => {
        const hash = txid.toString("base64");
        this.once(`tx:${hash}`, (tx) => {
          output[i] = tx;
          remaining--;
          if (remaining > 0) return;
          if (timeout != null) clearTimeout(timeout);
          cb(null, output);
        });
      });

      const inventory = txids.map((hash: Buffer) => ({
        type: INV.MSG_TX,
        hash,
      }));
      this.send("getdata", inventory);

      if (!opts.timeout) return;
      timeout = setTimeout(() => {
        debug(
          `getTransactions timed out: ${opts.timeout} ms, remaining: ${remaining}/${txids.length}`
        );
        events.removeAll();
        const err = new Error("Request timed out");
        // err.timeout = true;
        cb(err);
      }, opts.timeout);
    }
  }

  getHeaders(
    locator: Array<Buffer>,
    opts: Opts,
    cb: (_err: Error | null, headers?: Array<Header>) => void
  ) {
    if (this.gettingHeaders) {
      this.getHeadersQueue.push({ locator, opts, cb });
      debug(
        `queued "getHeaders" request: queue size=${this.getHeadersQueue.length}`
      );
      return;
    }
    this.gettingHeaders = true;

    if (typeof opts === "function") {
      cb = opts;
      opts = {};
    } else if (typeof locator === "function") {
      cb = locator;
      opts = {};
      locator = [];
    }

    opts.stop = opts.stop || nullHash;
    opts.timeout = opts.timeout != null ? opts.timeout : this._getTimeout();
    let timeout: NodeJS.Timeout;
    const onHeaders = (headers: Array<Header>) => {
      if (timeout) clearTimeout(timeout);
      cb(null, headers);
      this._nextHeadersRequest();
    };
    this.once("headers", onHeaders);
    this.send("getheaders", {
      version: this.protocolVersion,
      locator,
      hashStop: opts.stop,
    });
    if (!opts.timeout) return;
    timeout = setTimeout(() => {
      debug(`getHeaders timed out: ${opts.timeout} ms`);
      this.removeListener("headers", onHeaders);
      const error = new Error("Request timed out");
      // error.timeout = true;
      cb(error);
      this._nextHeadersRequest();
    }, opts.timeout);
  }

  _nextHeadersRequest() {
    this.gettingHeaders = false;
    if (this.getHeadersQueue.length === 0) return;
    const req = this.getHeadersQueue.shift();
    if (req) this.getHeaders(req.locator, req.opts, req.cb);
  }
}
