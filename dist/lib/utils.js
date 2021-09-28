"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServices = exports.hashTx = exports.hashBlock = void 0;
const crypto_1 = require("crypto");
const constants_1 = require("./constants");
const encodeHeader = require("bitcoin-protocol").types.header.encode;
const encodeTx = require("bitcoin-protocol").types.transaction.encode;
const sha256 = (data) => (0, crypto_1.createHash)("sha256").update(data).digest();
const hashBlock = (header) => sha256(sha256(encodeHeader(header)));
exports.hashBlock = hashBlock;
const hashTx = (tx) => sha256(sha256(encodeTx(tx)));
exports.hashTx = hashTx;
// export const toHexString = (byteArray: Uint8Array) => Array.from(byteArray, (byte) => ("0" + (byte & 0xff).toString(16)).slice(-2)).join("");
const getServices = (buf) => {
    const services = {};
    constants_1.serviceBits.forEach((sr) => {
        const byteIndex = Math.floor(sr.value / 8);
        const byte = buf.readUInt32LE(byteIndex);
        const bitIndex = sr.value % 8;
        if (byte & (1 << bitIndex)) {
            services[sr.key] = true;
        }
    });
    return services;
};
exports.getServices = getServices;
//# sourceMappingURL=utils.js.map