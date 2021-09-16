"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.Peer = void 0;
var crypto_1 = require("crypto");
var bitcoin_protocol_1 = require("bitcoin-protocol");
var through2 = require("through2");
var utils_1 = require("./utils");
var events_1 = require("events");
var debug_1 = require("debug");
var inventory_1 = require("./params/inventory");
var wrapEvents = require("event-cleanup");
var debug = debug_1["default"]("bitcoin-net:peer");
var rx = debug_1["default"]("bitcoin-net:messages:rx");
var tx = debug_1["default"]("bitcoin-net:messages:tx");
var INV = inventory_1.inventory;
var SERVICES_SPV = Buffer.from("0800000000000000", "hex");
var SERVICES_FULL = Buffer.from("0100000000000000", "hex");
var BLOOMSERVICE_VERSION = 70011;
var LATENCY_EXP = 0.5; // coefficient used for latency exponential average
var INITIAL_PING_N = 4; // send this many pings when we first connect
var INITIAL_PING_INTERVAL = 250; // wait this many ms between initial pings
var MIN_TIMEOUT = 4000; // lower bound for timeouts (in case latency is low)
var nullHash = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");
var serviceBits = [
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
var getServices = function (buf) {
    var services = {};
    serviceBits.forEach(function (sr) {
        var byteIndex = Math.floor(sr.value / 8);
        var byte = buf.readUInt32LE(byteIndex);
        var bitIndex = sr.value % 8;
        if (byte & (1 << bitIndex)) {
            services[sr.key] = true;
        }
    });
    return services;
};
var debugStream = function (f) {
    return through2.obj(function (message, enc, cb) {
        f(message);
        cb(null, message);
    });
};
var Peer = /** @class */ (function (_super) {
    __extends(Peer, _super);
    function Peer(params, opts) {
        var _this = this;
        utils_1.assertParams(params);
        _this = _super.call(this) || this;
        _this.params = params;
        _this.protocolVersion = params.protocolVersion || 70012;
        _this.minimumVersion = params.minimumVersion || 70001;
        _this.requireBloom = opts.requireBloom && true;
        _this.userAgent = opts.userAgent;
        if (!opts.userAgent) {
            if (process.browser)
                _this.userAgent = "/" + navigator.userAgent + "/";
            else
                _this.userAgent = "/node.js:" + process.versions.node + "/";
            _this.userAgent += "pentacle-app-node\":1.0.0/";
        }
        if (opts.subUserAgent)
            _this.userAgent += opts.subUserAgent;
        _this.handshakeTimeout = opts.handshakeTimeout || 8 * 1000;
        _this.getTip = opts.getTip;
        _this.relay = opts.relay || false;
        _this.pingInterval = opts.pingInterval || 15 * 1000;
        _this.version = null;
        _this.services = null;
        _this.socket = null;
        _this.relay = false;
        _this._handshakeTimeout = null;
        _this.disconnected = false;
        _this.latency = 2 * 1000; // default to 2s
        _this.verack = false;
        _this._pingInterval = undefined;
        _this.setMaxListeners(200);
        if (opts.socket)
            _this.connect(opts.socket);
        return _this;
    }
    Peer.prototype.send = function (command, eventNames, payload, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = this._getTimeout(); }
        return new Promise(function (resolve, reject) {
            var _a;
            if (!((_a = _this.socket) === null || _a === void 0 ? void 0 : _a.writable))
                reject(new Error("socket is not writable " + command));
            if (!_this._encoder)
                reject(new Error("Encoder is undefined"));
            if (_this._encoder) {
                if (eventNames && eventNames.length > 0) {
                    var nodejsTimeout_1 = setTimeout(function () {
                        debug(command + " timed out: " + timeout + " ms");
                        if (eventNames && eventNames.length > 0) {
                            eventNames.forEach(function (eventName) {
                                _this.removeListener(eventName, resolve);
                            });
                        }
                        var error = new Error("Request timed out");
                        reject(error);
                    }, timeout);
                    _this.registerOnceMulti(eventNames).then(function (ts) {
                        console.log("this.once nodejsTimeout", command, eventNames, timeout);
                        clearTimeout(nodejsTimeout_1);
                        resolve(ts);
                    });
                    // this.once(eventName, (t: T) => {
                    //   console.log("this.once nodejsTimeout", command, eventName, timeout);
                    //   clearTimeout(nodejsTimeout);
                    //   resolve(t);
                    // });
                }
                _this._encoder.write({ command: command, payload: payload });
            }
        });
    };
    Peer.prototype.registerOnceMono = function (eventName) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.once(eventName, function (t) {
                console.log("register once", eventName);
                resolve(t);
            });
        });
    };
    Peer.prototype.registerOnceMulti = function (eventNames) {
        var _this = this;
        var promises = [];
        eventNames.forEach(function (eventName) {
            var promise = new Promise(function (resolve) {
                return _this.registerOnceMono(eventName).then(function (t) {
                    console.log("register once", eventName);
                    resolve(t);
                });
            });
            promises.push(promise);
        });
        return Promise.all(promises).then(function (ts) {
            console.log("Promise all resolved", ts.length);
            return ts;
        });
    };
    Peer.prototype.connect = function (socket) {
        var _this = this;
        if (!socket || !socket.readable || !socket.writable) {
            throw new Error("Must specify socket duplex stream");
        }
        this.socket = socket;
        socket.once("close", function () {
            _this.disconnect(new Error("Socket closed"));
        });
        socket.on("error", this._error.bind(this));
        var protocolOpts = {
            magic: this.params.magic,
            messages: this.params.messages
        };
        var decoder = bitcoin_protocol_1.createDecodeStream(protocolOpts);
        decoder.on("error", this._error.bind(this));
        this._decoder = debugStream(rx);
        socket.pipe(decoder).pipe(this._decoder);
        this._encoder = debugStream(tx);
        var encoder = bitcoin_protocol_1.createEncodeStream(protocolOpts);
        this._encoder.pipe(encoder).pipe(socket);
        // timeout if handshake doesn't finish fast enough
        if (this.handshakeTimeout) {
            this._handshakeTimeout = setTimeout(function () {
                _this._handshakeTimeout = null;
                _this._error(new Error("Peer handshake timed out"));
            }, this.handshakeTimeout);
            this.once("ready", function () {
                if (_this._handshakeTimeout)
                    clearTimeout(_this._handshakeTimeout);
                _this._handshakeTimeout = null;
            });
        }
        // set up ping interval and initial pings
        this.once("ready", function () {
            _this._pingInterval = setInterval(function () {
                _this.ping()["catch"](function (error) {
                    console.warn(error.message);
                });
            }, _this.pingInterval);
            for (var i = 0; i < INITIAL_PING_N; i++) {
                setTimeout(function () {
                    _this.ping()["catch"](function (error) {
                        console.warn(error.message);
                    });
                }, INITIAL_PING_INTERVAL * i);
            }
        });
        this._registerListeners();
        this._sendVersion();
    };
    Peer.prototype.disconnect = function (err) {
        var _a;
        if (this.disconnected)
            return;
        this.disconnected = true;
        if (this._handshakeTimeout)
            clearTimeout(this._handshakeTimeout);
        clearInterval(undefined);
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.end();
        this.emit("disconnect", err);
    };
    Peer.prototype.ping = function () {
        var _this = this;
        var start = Date.now();
        var nonce = crypto_1.pseudoRandomBytes(8);
        var onPong = function (pong) {
            if (pong.nonce.compare(nonce) !== 0)
                throw new Error("pong.nonce is different");
            var elapsed = Date.now() - start;
            _this.latency = _this.latency * LATENCY_EXP + elapsed * (1 - LATENCY_EXP);
            return { pong: pong, elapsed: elapsed, latency: _this.latency };
        };
        return this.send("ping", ["pong"], {
            nonce: nonce
        }).then(function (pongs) { return onPong(pongs[0]); });
    };
    Peer.prototype._error = function (err) {
        this.emit("error", err);
        this.disconnect(err);
    };
    Peer.prototype._registerListeners = function () {
        var _this = this;
        if (this._decoder) {
            this._decoder.on("data", function (message) {
                _this.emit("message", message);
                _this.emit(message.command, message.payload);
            });
            this._decoder.on("error", this._error.bind(this));
        }
        if (this._encoder)
            this._encoder.on("error", this._error.bind(this));
        this.on("version", this._onVersion);
        this.on("verack", function () {
            if (_this.ready)
                return _this._error(new Error("Got duplicate verack"));
            _this.verack = true;
            _this._maybeReady();
        });
        this.on("ping", function (message) { return _this.send("pong", undefined, message); });
        this.on("block", function (block) {
            _this.emit("block:" + utils_1.getBlockHash(block.header).toString("base64"), block);
        });
        this.on("merkleblock", function (block) {
            _this.emit("merkleblock:" + utils_1.getBlockHash(block.header).toString("base64"), block);
        });
        this.on("tx", function (tx) {
            _this.emit("tx:" + utils_1.getTxHash(tx).toString("base64"), tx);
        });
    };
    Peer.prototype._onVersion = function (message) {
        this.services = getServices(message.services);
        if (!this.services.NODE_NETWORK) {
            return this._error(new Error("Node does not provide NODE_NETWORK service"));
        }
        this.version = message;
        if (message.version < this.minimumVersion) {
            return this._error(new Error("Peer is using an incompatible protocol version: " +
                ("required: >= " + this.minimumVersion + ", actual: " + message.version)));
        }
        if (this.requireBloom &&
            message.version >= BLOOMSERVICE_VERSION &&
            !this.services.NODE_BLOOM) {
            return this._error(new Error("Node does not provide NODE_BLOOM service"));
        }
        this.send("verack");
        this._maybeReady();
    };
    Peer.prototype._maybeReady = function () {
        if (!this.verack || !this.version)
            return;
        this.ready = true;
        this.emit("ready");
    };
    Peer.prototype.readyOnce = function () {
        return this.registerOnceMulti(["ready"]);
    };
    Peer.prototype._sendVersion = function () {
        var _a, _b, _c;
        var versionParams = {
            version: this.protocolVersion,
            services: SERVICES_SPV,
            timestamp: Math.round(Date.now() / 1000),
            receiverAddress: {
                services: SERVICES_FULL,
                address: ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || "0.0.0.0",
                port: ((_b = this.socket) === null || _b === void 0 ? void 0 : _b.remotePort) || 0
            },
            senderAddress: {
                services: SERVICES_SPV,
                address: "0.0.0.0",
                port: ((_c = this.socket) === null || _c === void 0 ? void 0 : _c.localPort) || 0
            },
            nonce: crypto_1.pseudoRandomBytes(8),
            userAgent: this.userAgent,
            startHeight: this.getTip ? this.getTip().height : 0,
            relay: this.relay
        };
        this.send("version", undefined, versionParams);
    };
    Peer.prototype._getTimeout = function () {
        return MIN_TIMEOUT + this.latency * 10;
    };
    Peer.prototype.getBlocks = function (hashes, merkle) {
        if (merkle === void 0) { merkle = false; }
        console.log("getBlocks");
        var eventNames = hashes.map(function (hash) {
            var eventName = merkle ? "merkleblock" : "block";
            eventName += ":" + hash.toString("base64");
            console.log("getBlocks event", eventName);
            return eventName;
        });
        var inventory = hashes.map(function (hash) {
            return {
                type: merkle ? INV.MSG_FILTERED_BLOCK : INV.MSG_BLOCK,
                hash: hash
            };
        });
        return this.send("getdata", eventNames, inventory);
    };
    Peer.prototype.getTransactionsById = function (txids, opts, cb) {
        var _this = this;
        var output = new Array(txids.length);
        if (opts.timeout == null)
            opts.timeout = this._getTimeout();
        var timeout;
        var remaining = txids.length;
        var events = wrapEvents(this);
        txids.forEach(function (txid, i) {
            var hash = txid.toString("base64");
            _this.once("tx:" + hash, function (tx) {
                output[i] = tx;
                remaining--;
                if (remaining > 0)
                    return;
                if (timeout != null)
                    clearTimeout(timeout);
                cb(null, output);
            });
        });
        var inventory = txids.map(function (hash) { return ({
            type: INV.MSG_TX,
            hash: hash
        }); });
        this.send("getdata", undefined, inventory);
        if (!opts.timeout)
            return;
        timeout = setTimeout(function () {
            debug("getTransactions timed out: " + opts.timeout + " ms, remaining: " + remaining + "/" + txids.length);
            events.removeAll();
            var err = new Error("Request timed out");
            // err.timeout = true;
            cb(err);
        }, opts.timeout);
    };
    Peer.prototype.getTransactionsByBlock = function (blockHash /* txids: Buffer[]*/) {
        // const output = new Array(txids.length);
        var _this = this;
        // if (blockHash) {
        //   const txIndex: { [key: string]: number } = {};
        //   txids.forEach((txid: Buffer, i: number) => {
        //     txIndex[txid.toString("base64")] = i;
        //   });
        return new Promise(function (resolve, reject) {
            _this.getBlocks([blockHash])
                .then(function (blocks) {
                blocks.map(function (block) {
                    return resolve(block.transactions);
                });
            })["catch"](function (err) {
                reject(err);
            });
            // for (let tx of blocks[0].transactions) {
            //   const id = hashTx(tx).toString("base64");
            //   const i = txIndex[id];
            //   if (i == null) continue;
            //   delete txIndex[id];
            //   output[i] = tx;
            // }
        });
    };
    Peer.prototype.getHeaders = function (locator, opts) {
        if (opts === void 0) { opts = {}; }
        var getHeadersParams = {
            version: this.protocolVersion,
            locator: locator,
            hashStop: opts.stop || nullHash
        };
        return this.send("getheaders", ["headers"], getHeadersParams, opts.timeout);
        // then((headerses: Array<Array<Header>>) => headerses[0]);
    };
    return Peer;
}(events_1.EventEmitter));
exports.Peer = Peer;
