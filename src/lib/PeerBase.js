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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.PeerBase = void 0;
// types
var events_1 = require("events");
// func
var crypto_1 = require("crypto");
var bitcoin_protocol_1 = require("bitcoin-protocol");
// helper funcs.
var utils_1 = require("./utils");
//constants
var constants_1 = require("./constants");
var PeerBase = /** @class */ (function (_super) {
    __extends(PeerBase, _super);
    function PeerBase(params, opts) {
        var _this = _super.call(this) || this;
        _this.params = params;
        _this.protocolVersion = params.protocolVersion || 70012;
        _this.minimumVersion = params.minimumVersion || 70001;
        _this.requireBloom = opts.requireBloom && true;
        _this.userAgent = opts.userAgent || "/node.js:" + process.versions.node + "/pentacle-app-node\":1.0.0/";
        _this.handshakeTimeout = opts.handshakeTimeout || 8 * 1000;
        _this.startHeigh = opts.startHeigh || 0;
        _this.relay = opts.relay || false;
        _this.pingInterval = opts.pingInterval || 15 * 1000;
        _this.version = null;
        _this.services = null;
        _this.socket = null;
        _this.relay = false;
        _this._handshakeTimeout = null;
        _this.disconnected = false;
        _this.verack = false;
        _this._pingInterval = undefined;
        _this.setMaxListeners(200);
        if (opts.socket)
            _this.connect(opts.socket);
        return _this;
    }
    PeerBase.prototype.emit = function (eventName) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var payload = args[0] || { command: "" };
        // console.log("args", args);
        var dismiss = ["ping", "pong", "message", "version", "verack", "addr", "alert"];
        if (!dismiss.includes(payload.command) && !dismiss.includes(eventName.toString()))
            console.log.apply(console, __spreadArray(["emitlog", eventName], args, false));
        return _super.prototype.emit.apply(this, __spreadArray([eventName], args, false));
    };
    PeerBase.prototype.send = function (command, eventNames, payload, timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = constants_1.DEFAULT_TIMEOUT; }
        if (!["ping", "pong", "version", "verack"].includes(command))
            console.log("send", command, eventNames, payload);
        return new Promise(function (resolve, reject) {
            var _a;
            if (!((_a = _this.socket) === null || _a === void 0 ? void 0 : _a.writable))
                reject(new Error("socket is not writable " + command));
            if (!_this.encoder)
                reject(new Error("Encoder is undefined"));
            if (_this.encoder) {
                if (eventNames && eventNames.length > 0) {
                    var nodejsTimeout_1 = setTimeout(function () {
                        // debug(`${command} timed out: ${timeout} ms`);
                        if (eventNames && eventNames.length > 0) {
                            eventNames.forEach(function (eventName) {
                                _this.removeListener(eventName, resolve);
                            });
                        }
                        var error = new Error("Request timed out");
                        reject(error);
                    }, timeout);
                    _this.registerOnceMulti(eventNames).then(function (ts) {
                        // console.log("this.once nodejsTimeout", command, eventNames, timeout);
                        clearTimeout(nodejsTimeout_1);
                        resolve(ts);
                    });
                    // this.once(eventName, (t: T) => {
                    //   console.log("this.once nodejsTimeout", command, eventName, timeout);
                    //   clearTimeout(nodejsTimeout);
                    //   resolve(t);
                    // });
                }
                _this.encoder.write({ command: command, payload: payload });
            }
        });
    };
    PeerBase.prototype.registerOnceMono = function (eventName) {
        var _this = this;
        if (eventName !== "pong")
            console.log("registerOnceMono registered.", eventName);
        return new Promise(function (resolve) {
            _this.once(eventName, function (t) {
                if (eventName !== "pong")
                    console.log("registerOnceMono resolved.", eventName);
                resolve(t);
            });
        });
    };
    PeerBase.prototype.registerOnceMulti = function (eventNames) {
        return __awaiter(this, void 0, void 0, function () {
            var promises, ts;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!eventNames.includes("pong"))
                            console.log("registerOnceMulti registered", eventNames);
                        promises = [];
                        eventNames.forEach(function (eventName) {
                            var promise = new Promise(function (resolve) {
                                return _this.registerOnceMono(eventName).then(function (t) {
                                    resolve(t);
                                });
                            });
                            promises.push(promise);
                        });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        ts = _a.sent();
                        if (!eventNames.includes("pong"))
                            console.log("registerOnceMulti promise all resolved.", ts.length);
                        return [2 /*return*/, ts];
                }
            });
        });
    };
    PeerBase.prototype.connect = function (socket) {
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
        this.decoder = (0, bitcoin_protocol_1.createDecodeStream)(protocolOpts);
        this.decoder.on("error", this._error.bind(this));
        socket.pipe(this.decoder);
        this.encoder = (0, bitcoin_protocol_1.createEncodeStream)(protocolOpts);
        this.encoder.pipe(socket);
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
                    // console.warn(error.message);
                });
            }, _this.pingInterval);
            for (var i = 0; i < constants_1.INITIAL_PING_N; i++) {
                setTimeout(function () {
                    _this.ping()["catch"](function (error) {
                        // console.warn(error.message);
                    });
                }, constants_1.INITIAL_PING_INTERVAL * i);
            }
        });
        this._registerListeners();
        this._sendVersion();
    };
    PeerBase.prototype.disconnect = function (err) {
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
    PeerBase.prototype.ping = function () {
        return __awaiter(this, void 0, void 0, function () {
            var nonce, onPong, pongs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nonce = (0, crypto_1.pseudoRandomBytes)(8);
                        onPong = function (pong) {
                            if (pong.nonce.compare(nonce) !== 0)
                                throw new Error("pong.nonce is different");
                            // console.log("ping elapsed ", Date.now() - start);
                            return pong;
                        };
                        return [4 /*yield*/, this.send("ping", ["pong"], { nonce: nonce })];
                    case 1:
                        pongs = _a.sent();
                        return [2 /*return*/, onPong(pongs[0])];
                }
            });
        });
    };
    PeerBase.prototype._error = function (err) {
        this.emit("error", err);
        this.disconnect(err);
    };
    PeerBase.prototype._registerListeners = function () {
        var _this = this;
        if (this.decoder) {
            this.decoder.on("data", function (message) {
                _this.emit("message", message);
                _this.emit(message.command, message.payload);
            });
            this.decoder.on("error", this._error.bind(this));
        }
        if (this.encoder)
            this.encoder.on("error", this._error.bind(this));
        this.on("version", this._onVersion);
        this.on("verack", function () {
            if (_this.ready)
                return _this._error(new Error("Got duplicate verack"));
            _this.verack = true;
            _this._maybeReady();
        });
        this.on("ping", function (message) { return _this.send("pong", undefined, message); });
        this.on("block", function (block) {
            var blockHashString = (0, utils_1.hashBlock)(block.header).toString("base64");
            _this.emit("block:" + blockHashString, block);
        });
        this.on("merkleblock", function (block) {
            var blockHashString = (0, utils_1.hashBlock)(block.header).toString("base64");
            _this.emit("merkleblock:" + blockHashString, block);
        });
        this.on("tx", function (tx) {
            var txHashString = (0, utils_1.hashTx)(tx).toString("base64");
            console.log("on tx", txHashString);
            _this.emit("tx:" + txHashString, tx);
        });
    };
    PeerBase.prototype._onVersion = function (message) {
        this.services = (0, utils_1.getServices)(message.services);
        if (!this.services.NODE_NETWORK) {
            return this._error(new Error("Node does not provide NODE_NETWORK service"));
        }
        this.version = message;
        if (message.version < this.minimumVersion) {
            return this._error(new Error("Peer is using an incompatible protocol version: " + ("required: >= " + this.minimumVersion + ", actual: " + message.version)));
        }
        if (this.requireBloom && message.version >= constants_1.BLOOMSERVICE_VERSION && !this.services.NODE_BLOOM) {
            return this._error(new Error("Node does not provide NODE_BLOOM service"));
        }
        this.send("verack");
        this._maybeReady();
    };
    PeerBase.prototype._maybeReady = function () {
        if (!this.verack || !this.version)
            return;
        this.ready = true;
        this.emit("ready");
    };
    PeerBase.prototype.readyOnce = function () {
        return this.registerOnceMulti(["ready"]);
    };
    PeerBase.prototype._sendVersion = function () {
        var _a, _b, _c;
        var versionParams = {
            version: this.protocolVersion,
            services: constants_1.SERVICES_SPV,
            timestamp: Math.round(Date.now() / 1000),
            receiverAddress: {
                services: constants_1.SERVICES_FULL,
                address: ((_a = this.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || "0.0.0.0",
                port: ((_b = this.socket) === null || _b === void 0 ? void 0 : _b.remotePort) || 0
            },
            senderAddress: {
                services: constants_1.SERVICES_SPV,
                address: "0.0.0.0",
                port: ((_c = this.socket) === null || _c === void 0 ? void 0 : _c.localPort) || 0
            },
            nonce: (0, crypto_1.pseudoRandomBytes)(8),
            userAgent: this.userAgent,
            startHeight: this.startHeigh,
            relay: this.relay
        };
        this.send("version", undefined, versionParams);
    };
    return PeerBase;
}(events_1.EventEmitter));
exports.PeerBase = PeerBase;
