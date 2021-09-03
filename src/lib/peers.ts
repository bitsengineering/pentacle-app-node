import { resolve } from "dns";
import { EventEmitter } from "events";
import { connect } from "net";
import ws from "websocket-stream";
import { createServer } from "http";
import Exchange from "peer-exchange";
import getBrowserRTC from "get-browser-rtc";
import { Peer } from "./peer";
import {
  assertParams,
  getBlockHash,
  getTxHash,
  getRandom,
  parseAddress,
} from "./utils";
import debug from "debug";
import { Socket } from "net";
import { Block, PeerParams, PeersParams, Transaction } from "../model";

const assign = require("object.assign/polyfill")();
const once = require("once");
const DEFAULT_PXP_PORT = 8192; // default port for peer-exchange nodes

export class Peers extends EventEmitter {
  private _params: PeersParams;
  private _numPeers: number;
  peers: any;
  private _hardLimit: boolean; // const debug = require("debug")("bitcoin-net:peergroup");
  websocketPort: number | null;
  private _connectWeb: boolean;
  connectTimeout: number;
  peerOpts: any;
  acceptIncoming?: boolean;
  connecting: boolean;
  closed: boolean;
  accepting: boolean;
  private _webSeeds?: Array<string>;
  private _exchange: any;
  constructor(
    params: PeerParams,
    opts?: {
      numPeers?: number;
      hardLimit?: boolean;
      connectWeb?: boolean;
      connectTimeout?: number;
      peerOpts?: any;
      acceptIncoming?: boolean;
      wrtc?: any;
      exchangeOpts?: any;
    }
  ) {
    assertParams(params);
    super();
    this._params = params;
    opts = opts || {};
    this._numPeers = opts.numPeers || 10;
    this.peers = [];
    this._hardLimit = opts.hardLimit || false;
    this.websocketPort = null;
    this._connectWeb =
      opts.connectWeb != null ? opts.connectWeb : process.browser;
    this.connectTimeout =
      opts.connectTimeout != null ? opts.connectTimeout : 8 * 1000;
    this.peerOpts = opts.peerOpts != null ? opts.peerOpts : {};
    this.acceptIncoming = opts.acceptIncoming;
    const acceptIncoming = this.acceptIncoming;
    this.connecting = false;
    this.closed = false;
    this.accepting = false;
    this._webSeeds = [];

    if (this._connectWeb) {
      let wrtc = opts.wrtc || getBrowserRTC();
      let envSeeds = process.env.WEB_SEED
        ? process.env.WEB_SEED.split(",").map((s) => s.trim())
        : [];
      this._webSeeds = this._params.webSeeds?.concat(envSeeds);
      try {
        this._exchange = Exchange(
          params.magic?.toString(16),
          assign({ wrtc, acceptIncoming }, opts.exchangeOpts)
        );
        console.log("_exchangeee", this._exchange);
      } catch (err: any) {
        // return this._error(err);
        console.log(err);
      }
      this._exchange.on("error", this._error.bind(this));
      this._exchange.on("connect", (stream: Socket) => {
        console.log("stream", stream);

        this._onConnection(null, stream);
      });
      if (!process.browser && acceptIncoming) {
        this._acceptWebsocket();
      }
    }

    this.on("block", (block: Block) => {
      this.emit(
        `block:${getBlockHash(block.header).toString("base64")}`,
        block
      );
    });
    this.on("merkleblock", (block: Block) => {
      this.emit(
        `merkleblock:${getBlockHash(block.header).toString("base64")}`,
        block
      );
    });
    this.on("tx", (tx: Transaction) => {
      this.emit(`tx:${getTxHash(tx).toString("base64")}`, tx);
    });
    this.once("peer", () => this.emit("connect"));
  }

  _error(err: Error) {
    this.emit("error", err);
  }

  // callback for peer discovery methods
  _onConnection(err?: Error | null, socket?: Socket) {
    if (err) {
      if (socket) socket.destroy();
      debug(`discovery connection error: ${err.message}`);
      this.emit("connectError", err, null);
      if (this.connecting) {
        setImmediate(this._connectPeer.bind(this));
      }
      return;
    }
    if (this.closed) return socket?.destroy();
    let opts = assign({ socket }, this.peerOpts);
    let peer = new Peer(this._params, opts);
    let onError = (err: Error) => {
      err = err || Error("Connection error");
      debug(`peer connection error: ${err.message}`);
      peer.removeListener("disconnect", onError);
      this.emit("connectError", err, peer);
      if (this.connecting) this._connectPeer();
    };
    peer.once("error", onError);
    peer.once("disconnect", onError);
    peer.once("ready", () => {
      if (this.closed) return peer.disconnect();
      peer.removeListener("error", onError);
      peer.removeListener("disconnect", onError);
      this.addPeer(peer);
    });
  }

  // connects to a new peer, via a randomly selected peer discovery method
  _connectPeer(cb?: any) {
    cb = cb || this._onConnection.bind(this);
    if (this.closed) return;
    if (this.peers.length >= this._numPeers) return;
    let getPeerArray = [];
    if (!process.browser) {
      if (this._params.dnsSeeds && this._params.dnsSeeds.length > 0) {
        getPeerArray.push(this._connectDNSPeer.bind(this));
      }
      if (this._params.staticPeers && this._params.staticPeers.length > 0) {
        getPeerArray.push(this._connectStaticPeer.bind(this));
      }
    }
    if (this._connectWeb && this._exchange.peers.length > 0) {
      getPeerArray.push(this._exchange.getNewPeer.bind(this._exchange));
    }
    if (this._params.getNewPeer) {
      getPeerArray.push(this._params.getNewPeer.bind(this._params));
    }
    if (getPeerArray.length === 0) {
      this.connecting = false;
      if (this.connectTimeout) {
        setTimeout(() => {
          this.connecting = true;
          setImmediate(this.connect.bind(this));
        }, this.connectTimeout);
      }
      return this._onConnection(Error("No methods available to get new peers"));
    }
    let getPeer = getRandom(getPeerArray);
    debug(`_connectPeer: getPeer = ${getPeer.name}`);
    getPeer(cb);
  }

  // connects to a random TCP peer via a random DNS seed
  // (selected from `dnsSeeds` in the params)
  _connectDNSPeer(cb: (arg0: NodeJS.ErrnoException) => void) {
    let seeds = this._params.dnsSeeds || [];
    let seed = getRandom(seeds);
    resolve(seed, (err, addresses) => {
      if (err) return cb(err);
      let address = getRandom(addresses);
      this._connectTCP(address, this._params.defaultPort, cb);
    });
  }

  // connects to a random TCP peer from `staticPeers` in the params
  _connectStaticPeer(cb: any) {
    let peers = this._params.staticPeers || [];
    let address = getRandom(peers);
    let peer = parseAddress(address);
    this._connectTCP(peer.hostname, peer.port || this._params.defaultPort, cb);
  }

  // connects to a standard protocol TCP peer
  _connectTCP(host: any, port: any, cb: any) {
    debug(`_connectTCP: tcp://${host}:${port}`);
    const socket = connect(port, host);
    let timeout: NodeJS.Timeout;
    if (this.connectTimeout) {
      timeout = setTimeout(() => {
        socket.destroy();
        cb(Error("Connection timed out"));
      }, this.connectTimeout);
    }
    socket.once("error", cb);
    socket.once("connect", () => {
      socket.ref();
      socket.removeListener("error", cb);
      clearTimeout(timeout);
      cb(null, socket);
    });
    socket.unref();
  }

  // connects to the peer-exchange peers provided by the params
  _connectWebSeeds() {
    this._webSeeds?.forEach((seed: any) => {
      debug(`connecting to web seed: ${JSON.stringify(seed, null, "  ")}`);
      const socket = ws(seed);
      socket.on("error", (err: any) => this._error(err));
      this._exchange.connect(socket, (err: { stack: any }, peer: any) => {
        if (err) {
          debug(
            `error connecting to web seed (pxp): ${JSON.stringify(
              seed,
              null,
              "  "
            )} ${err.stack}`
          );
          return;
        }
        debug(`connected to web seed: ${JSON.stringify(seed, null, "  ")}`);
        this.emit("webSeed", peer);
      });
    });
  }

  _assertPeers() {
    if (this.peers.length === 0) {
      throw Error("Not connected to any peers");
    }
  }

  _fillPeers() {
    if (this.closed) return;

    // TODO: smarter peer logic (ensure we don't have too many peers from the
    // same seed, or the same IP block)
    const n = this._numPeers - this.peers.length;
    debug(
      `_fillPeers: n = ${n}, numPeers = ${this._numPeers}, peers.length = ${this.peers.length}`
    );
    for (let i = 0; i < n; i++) this._connectPeer();
  }

  // sends a message to all peers
  send(command: any, payload: any, assert: any) {
    assert = assert != null ? assert : true;
    if (assert) this._assertPeers();
    for (let peer of this.peers) {
      peer.send(command, payload);
    }
  }

  // initializes the PeerGroup by creating peer connections
  connect(onConnect?: any) {
    debug("connect called");
    this.connecting = true;
    if (onConnect) this.once("connect", onConnect);

    // first, try to connect to web seeds so we can get web peers
    // once we have a few, start filling peers via any random
    // peer discovery method
    if (this._connectWeb && this._params.webSeeds && this._webSeeds?.length) {
      this.once("webSeed", () => this._fillPeers());
      return this._connectWebSeeds();
    }

    // if we aren't using web seeds, start filling with other methods
    this._fillPeers();
  }

  // disconnect from all peers and stop accepting connections
  close(cb: any) {
    if (cb) cb = once(cb);
    else
      cb = (err: any) => {
        if (err) this._error(err);
      };

    debug(`close called: peers.length = ${this.peers.length}`);
    this.closed = true;
    if (this.peers.length === 0) return cb(null);
    const peers = this.peers.slice(0);
    for (let peer of peers) {
      peer.once("disconnect", () => {
        if (this.peers.length === 0) cb(null);
      });
      peer.disconnect(Error("PeerGroup closing"));
    }
  }

  _acceptWebsocket(port?: any, cb?: any) {
    if (process.browser) return cb(null);
    if (!port) port = DEFAULT_PXP_PORT;
    this.websocketPort = port;
    const server = createServer();
    ws.createServer({ server }, (stream: any) => {
      this._exchange.accept(stream);
    });
    // http.listen(port);
    cb(null);
  }

  // manually adds a Peer
  addPeer(peer: Peer) {
    if (this.closed) throw Error("Cannot add peers, PeerGroup is closed");

    this.peers.push(peer);
    debug(`add peer: peers.length = ${this.peers.length}`);

    if (this._hardLimit && this.peers.length > this._numPeers) {
      const disconnectPeer = this.peers.shift();
      disconnectPeer?.disconnect(Error("PeerGroup over limit"));
    }

    const onMessage = (message: { command: string | symbol; payload: any }) => {
      this.emit("message", message, peer);
      this.emit(message.command, message.payload, peer);
    };
    peer.on("message", onMessage);

    peer.once("disconnect", (err) => {
      const index = this.peers.indexOf(peer);
      this.peers.splice(index, 1);
      peer.removeListener("message", onMessage);
      debug(
        `peer disconnect, peer.length = ${this.peers.length}, reason=${err}\n${err.stack}`
      );
      if (this.connecting) this._fillPeers();
      this.emit("disconnect", peer, err);
    });
    peer.on("error", (err) => {
      this.emit("peerError", err);
      peer.disconnect(err);
    });

    this.emit("peer", peer);
  }

  randomPeer() {
    this._assertPeers();
    return getRandom(this.peers);
  }

  getBlocks(hashes: any, opts: any, cb: any) {
    this._request("getBlocks", hashes, opts, cb);
  }

  getTransactions(blockHash: any, txids: any, opts: any, cb: any) {
    this._request("getTransactions", blockHash, txids, opts, cb);
  }

  getHeaders(locator: any, opts: any, cb: any) {
    this._request("getHeaders", locator, opts, cb);
  }

  // calls a method on a random peer,
  // and retries on another peer if it times out
  _request(
    method?: any,
    ...args: (((err: any, res: any) => void) | undefined)[]
  ) {
    let cb: any = args.pop();
    while (!cb) cb = args.pop();
    const peer = this.randomPeer();
    args.push((err, res) => {
      if (this.closed) return;
      if (err && err.timeout) {
        // if request times out, disconnect peer and retry with another random peer
        debug(`peer request "${method}" timed out, disconnecting`);
        peer.disconnect(err);
        this.emit("requestError", err);
        return this._request(method, ...args);
      }
      cb(err, res, peer);
    });
    peer[method](...args);
  }
}
