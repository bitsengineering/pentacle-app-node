"use strict";
exports.__esModule = true;
exports.dnsSeeds = exports.defaultPort = exports.magic = void 0;
var magic = 0xd9b4bef9;
exports.magic = magic;
var defaultPort = 8333;
exports.defaultPort = defaultPort;
var dnsSeeds = [
    "seed.bitcoin.sipa.be",
    "dnsseed.bluematt.me",
    "dnsseed.bitcoin.dashjr.org",
    "seed.bitcoinstats.com",
    "seed.bitnodes.io",
    "bitseed.xf2.org",
    "seed.bitcoin.jonasschnelli.ch",
];
exports.dnsSeeds = dnsSeeds;
var webSeeds = [
    "wss://us-west.seed.webcoin.io:8192",
    // TODO: add more
];
// definition of the genesis block's header
var genesisHeader = {
    height: 0,
    version: 1,
    // prevHash: u.nullHash,
    // merkleRoot: u.toHash('4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b'),
    timestamp: 1231006505,
    bits: 0x1d00ffff,
    nonce: 2083236893
};
// selected block headers for verifying initial sync
var checkpoints = [
    {
        version: 536870912,
        // prevHash: Buffer.from('6b05bd2c4a06b3d8503a033c2593396a25a79e1dcadb14000000000000000000', 'hex'),
        // merkleRoot: Buffer.from('1b08df3d42cd9a38d8b66adf9dc5eb464f503633bd861085ffff723634531596', 'hex'),
        timestamp: 1548657313,
        bits: 389048373,
        nonce: 716662719,
        height: 560448
    },
];
