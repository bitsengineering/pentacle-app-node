"use strict";
exports.__esModule = true;
// import Peer from "./peer";
// import PeerGroup from "./peerGroup.js";
var lib_1 = require("./lib");
var getBlocks = function () {
    peer.getBlocks([Buffer.from(GENESIS_BLOCK_HASH, "hex").reverse()], {}, function (err, blocks) {
        if (err == null) {
            console.log("getBlocks response for Genesis block:");
            blocks.forEach(function (block) {
                // console.log(block);
                block.transactions.forEach(function (transaction) {
                    // console.log(transaction);
                });
            });
        }
        else {
            console.error("getBlocks response error:");
            console.error(err);
        }
    });
};
var getHeaders = function () {
    peer.getHeaders([Buffer.from(GENESIS_BLOCK_HASH, "hex").reverse()], {}, function (err, headers) {
        if (err == null) {
            console.log("getHeaders response for Genesis block:");
            console.log(headers.length);
            console.log(headers.slice(0, 10));
            console.log(JSON.stringify(headers));
        }
        else {
            console.error("getHeaders response error:");
            console.error(err);
        }
    });
};
var getTransactions = function () {
    peer.getTransactions(Buffer.from("000000000000000000028237ea0c92173613601276ae0182b8fd04388fe3fc6a", "hex").reverse(), [
        Buffer.from("c72af2bd4827b54e4eef64a01a1e8fa29601c459c1e37dd9ab76dd118338e7bd", "hex").reverse(),
    ], {}, function (_err, transactions) {
        console.log("err", _err);
        console.log("transactions", transactions);
        transactions === null || transactions === void 0 ? void 0 : transactions.map(function (transaction) {
            console.log("transaction", transaction);
        });
    });
};
/* ****** */
//PEER GROUP CONNECTION
var GENESIS_BLOCK_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
// const peer = new Peers(params);
// peer.on("connect", () => {
//   console.log("connected");
//   // getBlocks();
//   getHeaders();
//   getTransactions();
// });
// // create connections to peers
// peer.connect();
/* ****** */
/* ****** */
//PEER CONNECTION
var net = require("net");
var socket = net.connect({ port: 8333, host: "seed.bitcoinstats.com" }, function () {
    var peer = new lib_1.Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, { socket: socket });
    peer.once("ready", function () {
        // GET BLOCKS
        getBlocks();
        /* ****** */
        //GET HEADERS
        // getHeaders();
        /* ****** */
        // GET TRANSACTIONS
        // getTransactions();
        /* ****** */
    });
});
/* ****** */
