"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerBase = void 0;
// types
const events_1 = require("events");
// func
const crypto_1 = require("crypto");
const bitcoin_protocol_1 = require("bitcoin-protocol");
// helper funcs.
const utils_1 = require("./utils");
//constants
const constants_1 = require("./constants");
class PeerBase extends events_1.EventEmitter {
    params;
    protocolVersion; // The highest protocol version understood by the transmitting node.
    minimumVersion;
    requireBloom;
    userAgent;
    handshakeTimeout;
    startHeigh;
    relay;
    pingInterval;
    version;
    services;
    socket;
    _handshakeTimeout;
    disconnected;
    encoder;
    decoder;
    _pingInterval;
    ready;
    verack;
    constructor(params, opts) {
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
        if (opts.socket)
            this.connect(opts.socket);
    }
    emit(eventName, ...args) {
        const payload = args[0] || { command: "" };
        // console.log("args", args);
        const dismiss = ["ping", "pong", "message", "version", "verack", "addr", "alert"];
        if (!dismiss.includes(payload.command) && !dismiss.includes(eventName.toString())) {
            // console.log("emitlog", eventName, ...args);
        }
        return super.emit(eventName, ...args);
    }
    send(command, eventNames, payload, timeout = constants_1.DEFAULT_TIMEOUT) {
        if (!["ping", "pong", "version", "verack"].includes(command)) {
            // console.log("send", command, eventNames, payload);
        }
        return new Promise((resolve, reject) => {
            if (!this.socket?.writable)
                reject(new Error(`socket is not writable ${command}`));
            if (!this.encoder)
                reject(new Error("Encoder is undefined"));
            if (this.encoder) {
                if (eventNames && eventNames.length > 0) {
                    let nodejsTimeout = setTimeout(() => {
                        // debug(`${command} timed out: ${timeout} ms`);
                        if (eventNames && eventNames.length > 0) {
                            eventNames.forEach((eventName) => {
                                this.removeListener(eventName, resolve);
                            });
                        }
                        const error = new Error("Request timed out");
                        reject(error);
                    }, timeout);
                    this.registerOnceMulti(eventNames).then((ts) => {
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
    registerOnceMono(eventName) {
        if (eventName !== "pong") {
            // console.log("registerOnceMono registered.", eventName);
        }
        return new Promise((resolve) => {
            this.once(eventName, (t) => {
                if (eventName !== "pong") {
                    // console.log("registerOnceMono resolved.", eventName);
                }
                resolve(t);
            });
        });
    }
    async registerOnceMulti(eventNames) {
        if (!eventNames.includes("pong")) {
            // console.log("registerOnceMulti registered", eventNames);
        }
        const promises = [];
        eventNames.forEach((eventName) => {
            const promise = new Promise((resolve) => {
                return this.registerOnceMono(eventName).then((t) => {
                    resolve(t);
                });
            });
            promises.push(promise);
        });
        const ts = await Promise.all(promises);
        if (!eventNames.includes("pong")) {
            // console.log("registerOnceMulti promise all resolved.", ts.length);
        }
        return ts;
    }
    connect(socket) {
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
        this.decoder = (0, bitcoin_protocol_1.createDecodeStream)(protocolOpts);
        this.decoder.on("error", this._error.bind(this));
        socket.pipe(this.decoder);
        this.encoder = (0, bitcoin_protocol_1.createEncodeStream)(protocolOpts);
        this.encoder.pipe(socket);
        // timeout if handshake doesn't finish fast enough
        if (this.handshakeTimeout) {
            this._handshakeTimeout = setTimeout(() => {
                this._handshakeTimeout = null;
                this._error(new Error("Peer handshake timed out"));
            }, this.handshakeTimeout);
            this.once("ready", () => {
                if (this._handshakeTimeout)
                    clearTimeout(this._handshakeTimeout);
                this._handshakeTimeout = null;
            });
        }
        // set up ping interval and initial pings
        this.once("ready", () => {
            this._pingInterval = setInterval(() => {
                this.ping().catch((error) => {
                    // console.warn(error.message);
                });
            }, this.pingInterval);
            for (let i = 0; i < constants_1.INITIAL_PING_N; i++) {
                setTimeout(() => {
                    this.ping().catch((error) => {
                        // console.warn(error.message);
                    });
                }, constants_1.INITIAL_PING_INTERVAL * i);
            }
        });
        this._registerListeners();
        this._sendVersion();
    }
    disconnect(err) {
        if (this.disconnected)
            return;
        this.disconnected = true;
        if (this._handshakeTimeout)
            clearTimeout(this._handshakeTimeout);
        clearInterval(undefined);
        this.socket?.end();
        this.emit("disconnect", err);
    }
    async ping() {
        // const start = Date.now();
        const nonce = (0, crypto_1.pseudoRandomBytes)(8);
        const onPong = (pong) => {
            if (pong.nonce.compare(nonce) !== 0)
                throw new Error("pong.nonce is different");
            // console.log("ping elapsed ", Date.now() - start);
            return pong;
        };
        const pongs = await this.send("ping", ["pong"], { nonce });
        return onPong(pongs[0]);
    }
    _error(err) {
        this.emit("error", err);
        this.disconnect(err);
    }
    _registerListeners() {
        if (this.decoder) {
            this.decoder.on("data", (message) => {
                this.emit("message", message);
                this.emit(message.command, message.payload);
            });
            this.decoder.on("error", this._error.bind(this));
        }
        if (this.encoder)
            this.encoder.on("error", this._error.bind(this));
        this.on("version", this._onVersion);
        this.on("verack", () => {
            if (this.ready)
                return this._error(new Error("Got duplicate verack"));
            this.verack = true;
            this._maybeReady();
        });
        this.on("ping", (message) => this.send("pong", undefined, message));
        this.on("block", (block) => {
            const blockHashString = (0, utils_1.hashBlock)(block.header).toString("base64");
            this.emit(`block:${blockHashString}`, block);
        });
        this.on("merkleblock", (block) => {
            const blockHashString = (0, utils_1.hashBlock)(block.header).toString("base64");
            this.emit(`merkleblock:${blockHashString}`, block);
        });
        this.on("tx", (tx) => {
            const txHashString = (0, utils_1.hashTx)(tx).toString("base64");
            // console.log("on tx", txHashString);
            this.emit(`tx:${txHashString}`, tx);
        });
    }
    _onVersion(message) {
        this.services = (0, utils_1.getServices)(message.services);
        if (!this.services.NODE_NETWORK) {
            return this._error(new Error("Node does not provide NODE_NETWORK service"));
        }
        this.version = message;
        if (message.version < this.minimumVersion) {
            return this._error(new Error("Peer is using an incompatible protocol version: " + `required: >= ${this.minimumVersion}, actual: ${message.version}`));
        }
        if (this.requireBloom && message.version >= constants_1.BLOOMSERVICE_VERSION && !this.services.NODE_BLOOM) {
            return this._error(new Error("Node does not provide NODE_BLOOM service"));
        }
        this.send("verack");
        this._maybeReady();
    }
    _maybeReady() {
        if (!this.verack || !this.version)
            return;
        this.ready = true;
        this.emit("ready");
    }
    readyOnce() {
        return this.registerOnceMulti(["ready"]);
    }
    _sendVersion() {
        const versionParams = {
            version: this.protocolVersion,
            services: constants_1.SERVICES_SPV,
            timestamp: Math.round(Date.now() / 1000),
            receiverAddress: {
                services: constants_1.SERVICES_FULL,
                address: this.socket?.remoteAddress || "0.0.0.0",
                port: this.socket?.remotePort || 0, // Receiving node's port number
            },
            senderAddress: {
                services: constants_1.SERVICES_SPV,
                address: "0.0.0.0",
                port: this.socket?.localPort || 0, // Transmitting node's port number
            },
            nonce: (0, crypto_1.pseudoRandomBytes)(8),
            userAgent: this.userAgent,
            startHeight: this.startHeigh,
            relay: this.relay,
        };
        this.send("version", undefined, versionParams);
    }
}
exports.PeerBase = PeerBase;
//# sourceMappingURL=PeerBase.js.map