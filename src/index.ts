import { pseudoRandomBytes } from "crypto";
import { Socket } from "net";
import * as params from "./lib/params/params";
// import Peer from "./peer";
// import PeerGroup from "./peerGroup.js";
import { Peer, Peers } from "./lib";
import { Block, Header, Transaction } from "./model";

/* ****** */
//PEER GROUP CONNECTION

const GENESIS_BLOCK_HASH =
  "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";

const peerGroup = new Peers(params);

peerGroup.on("peer", (peer: any) => {
  console.log("peer", peer);

  // console.log("connected to peer", peer.socket.remoteAddress);

  // console.log(peer);

  // send/receive messages
  peer.once("pong", () => {
    // console.log("pong");ƒ
  });

  const randomBytes = pseudoRandomBytes(8);
  peer.send("ping", { nonce: randomBytes });
  // console.log("ping");
});

peerGroup.on("connect", () => {
  console.log("connected");

  // testFunction;
  testFunction2();
});

// create connections to peers
peerGroup.connect();

// const testFunction = () => {
//   peerGroup.getBlocks(
//     [Buffer.from(GENESIS_BLOCK_HASH, "hex").reverse()],
//     {},
//     (err: Error, blocks: Array<Block>) => {
//       if (err == null) {
//         console.log("getBlocks response for Genesis block:");

//         blocks.forEach((block: Block) => {
//           // console.log(block);
//           block.transactions.forEach((transaction: Transaction) => {
//             // console.log(transaction);
//           });
//         });
//       } else {
//         console.error("getBlocks response error:");
//         console.error(err);
//       }
//     }
//   );
// };

const testFunction2 = () => {
  peerGroup.getHeaders(
    [Buffer.from(GENESIS_BLOCK_HASH, "hex").reverse()],
    {},
    (err: any, headers: any[]) => {
      if (err == null) {
        console.log("getHeaders response for Genesis block:");

        // console.log(headers.length);
        // console.log(headers.slice(0, 10));
        // console.log(JSON.stringify(headers));
      } else {
        console.error("getHeaders response error:");
        console.error(err);
      }
    }
  );
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
