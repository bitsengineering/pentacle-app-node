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
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
exports.__esModule = true;
exports.Peers = void 0;
var dns_1 = require("dns");
var events_1 = require("events");
var net_1 = require("net");
var websocket_stream_1 = require("websocket-stream");
var http_1 = require("http");
var peer_exchange_1 = require("peer-exchange");
var get_browser_rtc_1 = require("get-browser-rtc");
var peer_1 = require("./peer");
var utils_1 = require("./utils");
var debug_1 = require("debug");
var assign = require("object.assign/polyfill")();
var once = require("once");
var DEFAULT_PXP_PORT = 8192; // default port for peer-exchange nodes
var Peers = /** @class */ (function (_super) {
    __extends(Peers, _super);
    function Peers(params, opts) {
        var _this = this;
        utils_1.assertParams(params);
        _this = _super.call(this) || this;
        _this._params = params;
        opts = opts || {};
        _this._numPeers = opts.numPeers || 10;
        _this.peers = [];
        _this._hardLimit = opts.hardLimit || false;
        _this.websocketPort = null;
        _this._connectWeb =
            opts.connectWeb != null ? opts.connectWeb : process.browser;
        _this.connectTimeout =
            opts.connectTimeout != null ? opts.connectTimeout : 8 * 1000;
        _this.peerOpts = opts.peerOpts != null ? opts.peerOpts : {};
        _this.acceptIncoming = opts.acceptIncoming;
        var acceptIncoming = _this.acceptIncoming;
        _this.connecting = false;
        _this.closed = false;
        _this.accepting = false;
        _this._webSeeds = [];
        if (_this._connectWeb) {
            var wrtc = opts.wrtc || get_browser_rtc_1["default"]();
            var envSeeds = process.env.WEB_SEED
                ? process.env.WEB_SEED.split(",").map(function (s) { return s.trim(); })
                : [];
            _this._webSeeds = _this._params.webSeeds.concat(envSeeds);
            try {
                console.log("acceptIncoming", acceptIncoming);
                _this._exchange = peer_exchange_1["default"](params.magic.toString(16), assign({ wrtc: wrtc, acceptIncoming: acceptIncoming }, opts.exchangeOpts));
            }
            catch (err) {
                // return this._error(err);
                console.log(err);
            }
            _this._exchange.on("error", _this._error.bind(_this));
            _this._exchange.on("connect", function (stream) {
                console.log("stream", stream);
                _this._onConnection(null, stream);
            });
            if (!process.browser && acceptIncoming) {
                _this._acceptWebsocket();
            }
        }
        _this.on("block", function (block) {
            _this.emit("block:" + utils_1.getBlockHash(block.header).toString("base64"), block);
        });
        _this.on("merkleblock", function (block) {
            _this.emit("merkleblock:" + utils_1.getBlockHash(block.header).toString("base64"), block);
        });
        _this.on("tx", function (tx) {
            _this.emit("tx:" + utils_1.getTxHash(tx).toString("base64"), tx);
        });
        _this.once("peer", function () { return _this.emit("connect"); });
        return _this;
    }
    Peers.prototype._error = function (err) {
        this.emit("error", err);
    };
    // callback for peer discovery methods
    Peers.prototype._onConnection = function (err, socket) {
        var _this = this;
        if (err) {
            if (socket)
                socket.destroy();
            debug_1["default"]("discovery connection error: " + err.message);
            this.emit("connectError", err, null);
            if (this.connecting) {
                setImmediate(this._connectPeer.bind(this));
            }
            return;
        }
        if (this.closed)
            return socket === null || socket === void 0 ? void 0 : socket.destroy();
        var opts = assign({ socket: socket }, this.peerOpts);
        var peer = new peer_1.Peer(this._params, opts);
        var onError = function (err) {
            err = err || Error("Connection error");
            debug_1["default"]("peer connection error: " + err.message);
            peer.removeListener("disconnect", onError);
            _this.emit("connectError", err, peer);
            if (_this.connecting)
                _this._connectPeer();
        };
        peer.once("error", onError);
        peer.once("disconnect", onError);
        peer.once("ready", function () {
            if (_this.closed)
                return peer.disconnect();
            peer.removeListener("error", onError);
            peer.removeListener("disconnect", onError);
            _this.addPeer(peer);
        });
    };
    // connects to a new peer, via a randomly selected peer discovery method
    Peers.prototype._connectPeer = function (cb) {
        var _this = this;
        cb = cb || this._onConnection.bind(this);
        if (this.closed)
            return;
        if (this.peers.length >= this._numPeers)
            return;
        var getPeerArray = [];
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
                setTimeout(function () {
                    _this.connecting = true;
                    setImmediate(_this.connect.bind(_this));
                }, this.connectTimeout);
            }
            return this._onConnection(Error("No methods available to get new peers"));
        }
        var getPeer = utils_1.getRandom(getPeerArray);
        debug_1["default"]("_connectPeer: getPeer = " + getPeer.name);
        getPeer(cb);
    };
    // connects to a random TCP peer via a random DNS seed
    // (selected from `dnsSeeds` in the params)
    Peers.prototype._connectDNSPeer = function (cb) {
        var _this = this;
        var seeds = this._params.dnsSeeds;
        var seed = utils_1.getRandom(seeds);
        dns_1.resolve(seed, function (err, addresses) {
            if (err)
                return cb(err);
            var address = utils_1.getRandom(addresses);
            _this._connectTCP(address, _this._params.defaultPort, cb);
        });
    };
    // connects to a random TCP peer from `staticPeers` in the params
    Peers.prototype._connectStaticPeer = function (cb) {
        var peers = this._params.staticPeers;
        var address = utils_1.getRandom(peers);
        var peer = utils_1.parseAddress(address);
        this._connectTCP(peer.hostname, peer.port || this._params.defaultPort, cb);
    };
    // connects to a standard protocol TCP peer
    Peers.prototype._connectTCP = function (host, port, cb) {
        debug_1["default"]("_connectTCP: tcp://" + host + ":" + port);
        var socket = net_1.connect(port, host);
        var timeout;
        if (this.connectTimeout) {
            timeout = setTimeout(function () {
                socket.destroy();
                cb(Error("Connection timed out"));
            }, this.connectTimeout);
        }
        socket.once("error", cb);
        socket.once("connect", function () {
            socket.ref();
            socket.removeListener("error", cb);
            clearTimeout(timeout);
            cb(null, socket);
        });
        socket.unref();
    };
    // connects to the peer-exchange peers provided by the params
    Peers.prototype._connectWebSeeds = function () {
        var _this = this;
        this._webSeeds.forEach(function (seed) {
            debug_1["default"]("connecting to web seed: " + JSON.stringify(seed, null, "  "));
            var socket = websocket_stream_1["default"](seed);
            socket.on("error", function (err) { return _this._error(err); });
            _this._exchange.connect(socket, function (err, peer) {
                if (err) {
                    debug_1["default"]("error connecting to web seed (pxp): " + JSON.stringify(seed, null, "  ") + " " + err.stack);
                    return;
                }
                debug_1["default"]("connected to web seed: " + JSON.stringify(seed, null, "  "));
                _this.emit("webSeed", peer);
            });
        });
    };
    Peers.prototype._assertPeers = function () {
        if (this.peers.length === 0) {
            throw Error("Not connected to any peers");
        }
    };
    Peers.prototype._fillPeers = function () {
        if (this.closed)
            return;
        // TODO: smarter peer logic (ensure we don't have too many peers from the
        // same seed, or the same IP block)
        var n = this._numPeers - this.peers.length;
        debug_1["default"]("_fillPeers: n = " + n + ", numPeers = " + this._numPeers + ", peers.length = " + this.peers.length);
        for (var i = 0; i < n; i++)
            this._connectPeer();
    };
    // sends a message to all peers
    Peers.prototype.send = function (command, payload, assert) {
        assert = assert != null ? assert : true;
        if (assert)
            this._assertPeers();
        for (var _i = 0, _a = this.peers; _i < _a.length; _i++) {
            var peer = _a[_i];
            peer.send(command, payload);
        }
    };
    // initializes the PeerGroup by creating peer connections
    Peers.prototype.connect = function (onConnect) {
        var _this = this;
        debug_1["default"]("connect called");
        this.connecting = true;
        if (onConnect)
            this.once("connect", onConnect);
        // first, try to connect to web seeds so we can get web peers
        // once we have a few, start filling peers via any random
        // peer discovery method
        if (this._connectWeb && this._params.webSeeds && this._webSeeds.length) {
            this.once("webSeed", function () { return _this._fillPeers(); });
            return this._connectWebSeeds();
        }
        // if we aren't using web seeds, start filling with other methods
        this._fillPeers();
    };
    // disconnect from all peers and stop accepting connections
    Peers.prototype.close = function (cb) {
        var _this = this;
        if (cb)
            cb = once(cb);
        else
            cb = function (err) {
                if (err)
                    _this._error(err);
            };
        debug_1["default"]("close called: peers.length = " + this.peers.length);
        this.closed = true;
        if (this.peers.length === 0)
            return cb(null);
        var peers = this.peers.slice(0);
        for (var _i = 0, peers_1 = peers; _i < peers_1.length; _i++) {
            var peer = peers_1[_i];
            peer.once("disconnect", function () {
                if (_this.peers.length === 0)
                    cb(null);
            });
            peer.disconnect(Error("PeerGroup closing"));
        }
    };
    Peers.prototype._acceptWebsocket = function (port, cb) {
        var _this = this;
        if (process.browser)
            return cb(null);
        if (!port)
            port = DEFAULT_PXP_PORT;
        this.websocketPort = port;
        var server = http_1.createServer();
        websocket_stream_1["default"].createServer({ server: server }, function (stream) {
            _this._exchange.accept(stream);
        });
        // http.listen(port);
        cb(null);
    };
    // manually adds a Peer
    Peers.prototype.addPeer = function (peer) {
        var _this = this;
        if (this.closed)
            throw Error("Cannot add peers, PeerGroup is closed");
        this.peers.push(peer);
        debug_1["default"]("add peer: peers.length = " + this.peers.length);
        if (this._hardLimit && this.peers.length > this._numPeers) {
            var disconnectPeer = this.peers.shift();
            disconnectPeer === null || disconnectPeer === void 0 ? void 0 : disconnectPeer.disconnect(Error("PeerGroup over limit"));
        }
        var onMessage = function (message) {
            _this.emit("message", message, peer);
            _this.emit(message.command, message.payload, peer);
        };
        peer.on("message", onMessage);
        peer.once("disconnect", function (err) {
            var index = _this.peers.indexOf(peer);
            _this.peers.splice(index, 1);
            peer.removeListener("message", onMessage);
            debug_1["default"]("peer disconnect, peer.length = " + _this.peers.length + ", reason=" + err + "\n" + err.stack);
            if (_this.connecting)
                _this._fillPeers();
            _this.emit("disconnect", peer, err);
        });
        peer.on("error", function (err) {
            _this.emit("peerError", err);
            peer.disconnect(err);
        });
        this.emit("peer", peer);
    };
    Peers.prototype.randomPeer = function () {
        this._assertPeers();
        return utils_1.getRandom(this.peers);
    };
    Peers.prototype.getBlocks = function (hashes, opts, cb) {
        this._request("getBlocks", hashes, opts, cb);
    };
    Peers.prototype.getTransactions = function (blockHash, txids, opts, cb) {
        this._request("getTransactions", blockHash, txids, opts, cb);
    };
    Peers.prototype.getHeaders = function (locator, opts, cb) {
        this._request("getHeaders", locator, opts, cb);
    };
    // calls a method on a random peer,
    // and retries on another peer if it times out
    Peers.prototype._request = function (method) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var cb = args.pop();
        while (!cb)
            cb = args.pop();
        var peer = this.randomPeer();
        args.push(function (err, res) {
            if (_this.closed)
                return;
            if (err && err.timeout) {
                // if request times out, disconnect peer and retry with another random peer
                debug_1["default"]("peer request \"" + method + "\" timed out, disconnecting");
                peer.disconnect(err);
                _this.emit("requestError", err);
                return _this._request.apply(_this, __spreadArray([method], args));
            }
            cb(err, res, peer);
        });
        peer[method].apply(peer, args);
    };
    return Peers;
}(events_1.EventEmitter));
exports.Peers = Peers;
