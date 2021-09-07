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
var wrapEvents = require("event-cleanup");
var debug = debug_1["default"]("bitcoin-net:peer");
var rx = debug_1["default"]("bitcoin-net:messages:rx");
var tx = debug_1["default"]("bitcoin-net:messages:tx");
var INV = bitcoin_protocol_1.constants.inventory;
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
    Peer.prototype.send = function (command, eventName, payload, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = this._getTimeout(); }
        return new Promise(function (resolve, reject) {
            var _a;
            if (!((_a = _this.socket) === null || _a === void 0 ? void 0 : _a.writable))
                reject(new Error("socket is not writable"));
            if (!_this._encoder)
                reject(new Error("Encoder is undefined"));
            if (_this._encoder) {
                var nodejsTimeout_1 = setTimeout(function () {
                    debug(command + " timed out: " + timeout + " ms");
                    if (eventName)
                        _this.removeListener(eventName, resolve);
                    var error = new Error("Request timed out");
                    reject(error);
                }, timeout);
                if (eventName) {
                    _this.once(eventName, function (t) {
                        if (!nodejsTimeout_1)
                            clearTimeout(nodejsTimeout_1);
                        resolve(t);
                    });
                }
                _this._encoder.write({ command: command, payload: payload });
            }
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
            _this._pingInterval = setInterval(_this.ping.bind(_this), _this.pingInterval);
            for (var i = 0; i < INITIAL_PING_N; i++) {
                setTimeout(_this.ping.bind(_this), INITIAL_PING_INTERVAL * i);
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
    Peer.prototype.ping = function (cb) {
        var _this = this;
        var start = Date.now();
        var nonce = crypto_1.pseudoRandomBytes(8);
        var onPong = function (pong) {
            if (pong.nonce.compare(nonce) !== 0)
                return;
            _this.removeListener("pong", onPong);
            var elapsed = Date.now() - start;
            _this.latency = _this.latency * LATENCY_EXP + elapsed * (1 - LATENCY_EXP);
            if (cb)
                cb(null, elapsed, _this.latency);
        };
        this.on("pong", onPong);
        this.send("ping", undefined, { nonce: nonce });
    };
    Peer.prototype._error = function (err) {
        this.emit("error", err);
        this.disconnect(err);
    };
    Peer.prototype._registerListeners = function () {
        var _this = this;
        if (this._decoder)
            this._decoder.on("error", this._error.bind(this));
        if (this._decoder)
            this._decoder.on("data", function (message) {
                _this.emit("message", message);
                _this.emit(message.command, message.payload);
            });
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
    Peer.prototype._onceReady = function (cb) {
        if (this.ready)
            return cb();
        this.once("ready", cb);
    };
    Peer.prototype._sendVersion = function () {
        var _a, _b, _c;
        this.send("version", undefined, {
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
        });
    };
    Peer.prototype._getTimeout = function () {
        return MIN_TIMEOUT + this.latency * 10;
    };
    Peer.prototype.getBlocks = function (hashes, opts, cb) {
        if (typeof opts === "function") {
            cb = opts;
            opts = {};
        }
        if (opts.timeout == null)
            opts.timeout = this._getTimeout();
        var timeout;
        var events = wrapEvents(this);
        var output = new Array(hashes.length);
        var remaining = hashes.length;
        hashes.forEach(function (hash, i) {
            var event = (opts.filtered ? "merkle" : "") + "block:" + hash.toString("base64");
            events.once(event, function (block) {
                output[i] = block;
                remaining--;
                if (remaining > 0)
                    return;
                if (timeout != null)
                    clearTimeout(timeout);
                cb(null, output);
            });
        });
        var inventory = hashes.map(function (hash) { return ({
            type: opts.filtered ? INV.MSG_FILTERED_BLOCK : INV.MSG_BLOCK,
            hash: hash
        }); });
        this.send("getdata", undefined, inventory);
        if (!opts.timeout)
            return;
        timeout = setTimeout(function () {
            debug("getBlocks timed out: " + opts.timeout + " ms, remaining: " + remaining + "/" + hashes.length);
            events.removeAll();
            var error = new Error("Request timed out");
            // error.timeout = true;
            cb(error);
        }, opts.timeout);
    };
    Peer.prototype.getTransactions = function (blockHash, txids, opts, cb) {
        var _this = this;
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
        var output = new Array(txids.length);
        if (blockHash) {
            var txIndex_1 = {};
            txids.forEach(function (txid, i) {
                txIndex_1[txid.toString("base64")] = i;
            });
            this.getBlocks([blockHash], opts, function (err, blocks) {
                if (err)
                    return cb(err);
                if (blocks) {
                    for (var _i = 0, _a = blocks[0].transactions; _i < _a.length; _i++) {
                        var tx_1 = _a[_i];
                        var id = utils_1.getTxHash(tx_1).toString("base64");
                        var i = txIndex_1[id];
                        if (i == null)
                            continue;
                        delete txIndex_1[id];
                        output[i] = tx_1;
                    }
                }
                cb(null, output);
            });
        }
        else {
            if (opts.timeout == null)
                opts.timeout = this._getTimeout();
            // TODO: make a function for all these similar timeout request methods
            var timeout_1;
            var remaining_1 = txids.length;
            var events_2 = wrapEvents(this);
            txids.forEach(function (txid, i) {
                var hash = txid.toString("base64");
                _this.once("tx:" + hash, function (tx) {
                    output[i] = tx;
                    remaining_1--;
                    if (remaining_1 > 0)
                        return;
                    if (timeout_1 != null)
                        clearTimeout(timeout_1);
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
            timeout_1 = setTimeout(function () {
                debug("getTransactions timed out: " + opts.timeout + " ms, remaining: " + remaining_1 + "/" + txids.length);
                events_2.removeAll();
                var err = new Error("Request timed out");
                // err.timeout = true;
                cb(err);
            }, opts.timeout);
        }
    };
    Peer.prototype.getHeaders = function (locator, opts) {
        if (opts === void 0) { opts = {}; }
        var getHeadersParams = {
            version: this.protocolVersion,
            locator: [locator],
            hashStop: opts.stop || nullHash
        };
        return this.send("getheaders", "headers", getHeadersParams, opts.timeout);
    };
    return Peer;
}(events_1.EventEmitter));
exports.Peer = Peer;
