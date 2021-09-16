"use strict";
exports.__esModule = true;
exports.dnsSeeds = exports.GENESIS_BLOCK_HASH = exports.serviceBits = exports.DEFAULT_TIMEOUT = exports.LATENCY = exports.MIN_TIMEOUT = exports.INITIAL_PING_INTERVAL = exports.BLOOMSERVICE_VERSION = exports.INITIAL_PING_N = exports.SERVICES_FULL = exports.SERVICES_SPV = exports.nullHash = exports.defaultPort = exports.magic = void 0;
exports.magic = 0xd9b4bef9;
exports.defaultPort = 8333;
exports.nullHash = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");
exports.SERVICES_SPV = Buffer.from("0800000000000000", "hex");
exports.SERVICES_FULL = Buffer.from("0100000000000000", "hex");
exports.INITIAL_PING_N = 4; // send this many pings when we first connect
exports.BLOOMSERVICE_VERSION = 70011;
exports.INITIAL_PING_INTERVAL = 250; // wait this many ms between initial pings
exports.MIN_TIMEOUT = 4000; // lower bound for timeouts (in case latency is low)
exports.LATENCY = 2 * 1000;
exports.DEFAULT_TIMEOUT = exports.MIN_TIMEOUT + exports.LATENCY * 10;
exports.serviceBits = [
    { key: "NODE_NETWORK", value: 0 },
    { key: "NODE_GETUTXO", value: 1 },
    { key: "NODE_BLOOM", value: 2 },
    { key: "NODE_WITNESS", value: 3 },
    { key: "NODE_NETWORK_LIMITED", value: 10 },
];
exports.GENESIS_BLOCK_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
exports.dnsSeeds = [
    "seed.bitcoin.sipa.be",
    "dnsseed.bluematt.me",
    "dnsseed.bitcoin.dashjr.org",
    "seed.bitcoinstats.com",
    "seed.bitnodes.io",
    "bitseed.xf2.org",
    "seed.bitcoin.jonasschnelli.ch",
];
