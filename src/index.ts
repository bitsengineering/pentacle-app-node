import { pseudoRandomBytes } from "crypto";
import { Socket } from "net";
// import * as params from "./lib/params/params";
// import Peer from "./peer";
// import PeerGroup from "./peerGroup.js";
import { Peer, utils } from "./lib";
import { Block, Header, Transaction } from "./model";

/* ****** */
//PEER GROUP CONNECTION

// const GENESIS_BLOCK_HASH =
//   "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";

// const peerGroup = new Peers(params);

// peerGroup.on("connect", () => {
//   console.log("connected");
//   // getPeersBlocks();
//   getPeersHeaders();
// });

// // create connections to peers
// peerGroup.connect();

// const getPeersBlocks = () => {
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

// const getPeersHeaders = () => {
//   peerGroup.getHeaders(
//     [Buffer.from(GENESIS_BLOCK_HASH, "hex").reverse()],
//     {},
//     (err: any, headers: any[]) => {
//       if (err == null) {
//         console.log("getHeaders response for Genesis block:");
//         console.log(headers.length);
//         console.log(headers.slice(0, 10));
//         console.log(JSON.stringify(headers));
//       } else {
//         console.error("getHeaders response error:");
//         console.error(err);
//       }
//     }
//   );
// };

/* ****** */

/* ****** */
//PEER CONNECTION

const net = require("net");
const socket: Socket = net.connect({ port: 8333, host: "seed.bitcoin.sipa.be" }, () => {
  const peer = new Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, { socket });
  peer.readyOnce().then(() => {
    // GET BLOCKS
    // getPeerBlocks();

    //GET HEADERS
    getPeerHeaders();

    // GET TRANSACTIONS
    // getPeerTransactionsById();
  });

  const getPeerHeaders = () => {
    peer
      .getHeaders([Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse()])
      .then((headerses: Array<Array<Header>>) => {
        console.log(headerses.length);
        console.log(headerses[0].length);
        console.log("headers", headerses[0][0].header.version);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  /* const getPeerBlocks = () => {
    peer.getBlocks(
      [
        Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse(),
        Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse(),
      ],
      {},
      (_err: Error | null, blocks?: Array<Block>) => {
        console.log("err", _err);
        // console.log("blocks", blocks);
        blocks?.forEach((block: Block) => {
          console.log(block.header.prevHash, block.transactions.length);
          // block.transactions.forEach((transaction: Transaction) => {
          //   console.log(transaction);
          //   const a = utils.toHexString(transaction.ins[0].hash);
          //   console.log("hashhh", a);
          // });
        });
      }
    );
  }; */

  /* const getPeerTransactionsByBlock = () => {
    peer.getTransactionsByBlock(
      Buffer.from("000000000000000000028237ea0c92173613601276ae0182b8fd04388fe3fc6a", "hex").reverse(),
      [Buffer.from("c72af2bd4827b54e4eef64a01a1e8fa29601c459c1e37dd9ab76dd118338e7bd", "hex").reverse()],
      {},
      (_err: Error | null, transactions?: Array<Transaction>) => {
        console.log("err", _err);
        console.log("transactions", transactions);
        transactions?.map((transaction) => {
          console.log("transaction", transaction);
        });
      }
    );
  };

  const getPeerTransactionsById = () => {
    peer.getTransactionsById(
      [Buffer.from("538e7f38afa8c6434191c1693a8b30de7cede3a73883f83e7b07c637f2109005", "hex").reverse()],
      {},
      (_err: Error | null, transactions?: Array<Transaction>) => {
        console.log("err", _err);
        console.log("transactions", transactions);
        transactions?.map((transaction) => {
          console.log("transaction", transaction);
        });
      }
    );
  }; */
});

/* ****** */
