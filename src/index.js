"use strict";
exports.__esModule = true;
var crypto_1 = require("crypto");
var params = require("./lib/params/params");
var peers_1 = require("./lib/peers");
/* ****** */
//PEER GROUP CONNECTION
var GENESIS_BLOCK_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";
var peerGroup = new peers_1.Peers(params);
peerGroup.on("peer", function (peer) {
    console.log("peer", peer);
    // console.log("connected to peer", peer.socket.remoteAddress);
    // console.log(peer);
    // send/receive messages
    peer.once("pong", function () {
        // console.log("pong");ƒ
    });
    var randomBytes = crypto_1.pseudoRandomBytes(8);
    peer.send("ping", { nonce: randomBytes });
    // console.log("ping");
});
peerGroup.on("connect", function () {
    console.log("connected");
    // testFunction;
    testFunction();
});
// create connections to peers
peerGroup.connect();
var testFunction = function () {
    peerGroup.getBlocks([Buffer.from(GENESIS_BLOCK_HASH, "hex").reverse()], {}, function (err, blocks) {
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
var testFunction2 = function () {
    peerGroup.getHeaders([Buffer.from(GENESIS_BLOCK_HASH, "hex").reverse()], {}, function (err, headers) {
        if (err == null) {
            console.log("getHeaders response for Genesis block:");
            // console.log(headers.length);
            // console.log(headers.slice(0, 10));
            // console.log(JSON.stringify(headers));
        }
        else {
            console.error("getHeaders response error:");
            console.error(err);
        }
    });
};
/* ****** */
/* ****** */
//PEER CONNECTION
// const net = require("net");
// const socket: Socket = net.connect(
//   { port: 8333, host: "seed.bitcoinstats.com" },
//   () => {
//     const peer = new Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, { socket });
//     peer.once("ready", () => {
//       /* ****** */
//       // GET BLOCKS
//       // peer.getBlocks(
//       //   [
//       //     Buffer.from(
//       //       "0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002",
//       //       "hex"
//       //     ).reverse(),
//       //   ],
//       //   {},
//       //   (_err: Error | null, blocks?: Array<Block>) => {
//       //     console.log("err", _err);
//       //     // console.log("blocks", blocks);
//       //     blocks?.forEach((block: Block) => {
//       //       console.log(block);
//       //       block.transactions.forEach((transaction: Transaction) => {
//       //         console.log(transaction);
//       //       });
//       //     });
//       //   }
//       // );
//       /* ****** */
//       /* ****** */
//       //GET HEADERS
//       // peer.getHeaders(
//       //   [
//       //     Buffer.from(
//       //       "0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002",
//       //       "hex"
//       //     ).reverse(),
//       //   ],
//       //   {},
//       //   (_err: Error | null, headers?: Array<Header>) => {
//       //     console.log("err", _err);
//       //     console.log("headers", headers);
//       //   }
//       // );
//       /* ****** */
//       /* ****** */
//       // GET TRANSACTIONS
//       // peer.getTransactions(
//       //   Buffer.from(
//       //     "0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002",
//       //     "hex"
//       //   ).reverse(),
//       //   [
//       //     Buffer.from(
//       //       "PEJ1ZmZlciAyNiA1MyA1YyBlMCA2YyA1MSA0NyA0YiA3NCAxMyBhMSAwNyAxNiBmOCBlMCA1MCAxNyA2YyBhYSA4NyBhZSAwNCA5MyBjMSA2NCBiNyA2NSA1ZCA2YSA2NSAzMyA0Yj4s"
//       //     ),
//       //   ],
//       //   {},
//       //   (_err: Error | null, transactions?: Array<Transaction>) => {
//       //     console.log("err", _err);
//       //     console.log("transactions", transactions);
//       //   }
//       // );
//       /* ****** */
//     });
//   }
// );
/* ****** */
