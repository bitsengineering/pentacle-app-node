"use strict";
exports.__esModule = true;
exports.getTxHash = exports.getBlockHash = exports.sha256 = exports.assertParams = exports.parseAddress = exports.getRandom = void 0;
var url = require("url");
var crypto_1 = require("crypto");
var encodeHeader = require("bitcoin-protocol").types.header.encode;
var encodeTx = require("bitcoin-protocol").types.transaction.encode;
var getRandom = function (array) {
    return array[Math.floor(Math.random() * array.length)];
};
exports.getRandom = getRandom;
var parseAddress = function (address) {
    // if address has a protocol in it, we don't need to add a fake one
    if (/^\w+:\/\//.test(address))
        return url.parse(address);
    return url.parse("x://" + address);
};
exports.parseAddress = parseAddress;
var assertParams = function (params) {
    // TODO: check more things
    // TODO: give more specific errors
    if (!params || params.magic == null || !params.defaultPort) {
        throw new Error("Invalid network parameters");
    }
};
exports.assertParams = assertParams;
var sha256 = function (data) {
    return crypto_1.createHash("sha256").update(data).digest();
};
exports.sha256 = sha256;
var getBlockHash = function (header) {
    var headerBytes = encodeHeader(header);
    return exports.sha256(exports.sha256(headerBytes));
};
exports.getBlockHash = getBlockHash;
var getTxHash = function (tx) {
    var txBytes = encodeTx(tx);
    return exports.sha256(exports.sha256(txBytes));
};
exports.getTxHash = getTxHash;
