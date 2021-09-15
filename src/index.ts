import { Peer } from "./lib";
import { Socket, connect as connectNet } from "net";
import { Block, Header, Transaction } from "./model";
import { dnsSeeds, GENESIS_BLOCK_HASH } from "./lib/constants";
import { hashTx } from "./lib/utils";

const peer = new Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, {});

const getPeerHeaders = () => {
  console.log("getPeerHeaders");

  const hashes: Buffer[] = [Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse()];

  peer
    .getHeaders(hashes)
    .then((headerses: Header[][]) => {
      console.log("getPeerHeaders then");
      console.log(headerses.length);
      console.log(headerses[0].length);
      console.log("headers", headerses[0][0].header.version);
    })
    .catch((error) => {
      console.log("getPeerHeaders catch");
      console.log(error);
    });
};

const getPeersBlocks = () => {
  console.log("getPeersBlocks");

  const hashes: Buffer[] = [
    // Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse(),
    // Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse(),
    Buffer.from("6a4690e6ba50e286b8c63c826399a6ac73be3f479f17406cdf90468700000000", "hex"),
    // Buffer.from("00000000000000000008c80ccd63c1259027d30b96c48feacae19f055b1f1677", "hex").reverse(),
  ];
  const merkle: boolean = false;

  return peer
    .getBlocks(hashes, merkle)
    .then((blocksArray: Block[]) => {
      console.log("blocksArray then");
      // console.log(blocksArray.length);
      // console.log("blocks header.prevHash", blocksArray[0].header.prevHash);
      console.log("blocks transactions[0] budur", blocksArray[0].transactions[0]);
      return blocksArray[0];
    })
    .catch((error) => {
      console.log("blocksArray catch");
      console.log(error);
      throw new Error(error);
    });
};

const getTransactionsById = (buffer?: Buffer, witness?: boolean) => {
  const hashes: Buffer[] = buffer
    ? [buffer]
    : [
        // Buffer.from("538e7f38afa8c6434191c1693a8b30de7cede3a73883f83e7b07c637f2109005", "hex").reverse(),
        // Buffer.from("f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16", "hex").reverse(),
        // Buffer.from("3797c09006aaad367f7342e215820e499bfbb809f042c690fb7a71b8537c0868", "hex").reverse(),
        // Buffer.from(txid, "hex").reverse(),
        Buffer.from("1d2362fba0bd11cabdae3e080dad5f0f4db43799052ccaedfe1823baf3b702da", "hex").reverse(),
      ];

  // console.log("bltx", buffer);
  // console.log("huso", Buffer.from("3797c09006aaad367f7342e215820e499bfbb809f042c690fb7a71b8537c0868", "hex").reverse());
  console.log("uu", hashes);

  return peer
    .getTransactionsById(hashes, true)
    .then((transactions: Transaction[]) => {
      console.log("getTransactionsById then");
      console.log(transactions.length);
      console.log("transactions version", transactions[0].version);
      console.log("transactions ins.length", transactions[0].ins.length);
    })
    .catch((error) => {
      console.log("getTransactionsById catch");
      console.log(error);
    });
};

const connectionListener = (socket: Socket) => {
  peer.connect(socket);

  peer.readyOnce().then(() => {
    // getPeerHeaders();

    /* getPeersBlocks().then((block: Block) => {
      console.log("hashTx", hashTx(block.transactions[0]));
      getTransactionsById(hashTx(block.transactions[0]), block.transactions[0].version === 2);
      // getTransactionsById();
    }); */

    getTransactionsById();
  });
};

const testIt = () => {
  const socket: Socket = connectNet({ port: 8333, host: dnsSeeds[1] }, () => {
    connectionListener(socket);
  });
};

testIt();
