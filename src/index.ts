import { Peer } from "./lib";
import { Socket, connect as connectNet } from "net";
import { Block, Header, Transaction } from "./model";
import { dnsSeeds, GENESIS_BLOCK_HASH } from "./lib/constants";
import { hashTx } from "./lib/utils";

const peer = new Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, {});

const getPeerHeaders = (blockHashes?: string[]): Promise<Header[][]> => {
  console.log("getPeerHeaders");

  const hashes: string[] = blockHashes || ["0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002"];

  return peer
    .getHeaders(hashes)
    .then((headerses: Header[][]) => {
      console.log("getPeerHeaders then");
      console.log(headerses.length);
      console.log(headerses[0].length);
      console.log("headers", headerses[0][0].header.version);
      return headerses;
    })
    .catch((error) => {
      console.log("getPeerHeaders catch");
      console.log(error);
      throw error;
    });
};

const getPeerBlocks = (blockHashes?: string[]): Promise<Block[]> => {
  console.log("getPeersBlocks");

  const hashes: string[] = blockHashes || [
    // "0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002",
    // "0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002",
    "6a4690e6ba50e286b8c63c826399a6ac73be3f479f17406cdf90468700000000",
    // "00000000000000000008c80ccd63c1259027d30b96c48feacae19f055b1f1677",
  ];
  const merkle: boolean = false;

  return peer
    .getBlocks(hashes, merkle)
    .then((blocksArray: Block[]) => {
      console.log("blocksArray then");
      // console.log(blocksArray.length);
      // console.log("blocks header.prevHash", blocksArray[0].header.prevHash);
      console.log("blocks transactions[0] budur", blocksArray[0].transactions[0]);
      return blocksArray;
    })
    .catch((error) => {
      console.log("blocksArray catch");
      console.log(error);
      throw new Error(error);
    });
};

const getPeerTransactionsByTx = (txids?: string[], witness?: boolean) => {
  const hashes: string[] = txids || [
    // "538e7f38afa8c6434191c1693a8b30de7cede3a73883f83e7b07c637f2109005",
    // "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
    // "3797c09006aaad367f7342e215820e499bfbb809f042c690fb7a71b8537c0868",
    "1d2362fba0bd11cabdae3e080dad5f0f4db43799052ccaedfe1823baf3b702da",
  ];

  // console.log("bltx", buffer);
  // console.log("huso", Buffer.from("3797c09006aaad367f7342e215820e499bfbb809f042c690fb7a71b8537c0868", "hex").reverse());
  console.log("uu", hashes);

  return peer
    .getTransactionsByTx(hashes, true)
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

const getPeerTransactionsByBlock = (blockHashes?: string[]) => {
  const hashes: string[] = blockHashes || [
    "0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002",
    // "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
    // "3797c09006aaad367f7342e215820e499bfbb809f042c690fb7a71b8537c0868",
    // "1d2362fba0bd11cabdae3e080dad5f0f4db43799052ccaedfe1823baf3b702da",
  ];

  return peer
    .getTransactionsByBlock(hashes)
    .then((transactions: Transaction[][]) => {
      console.log("getTransactionsByBlock then");
      console.log(transactions.length);
      console.log("transactions version", transactions[0][0].version);
      console.log("transactions ins.length", transactions[0][0].ins.length);
    })
    .catch((error) => {
      console.log("getTransactionsByBlock catch");
      console.log(error);
    });
};

const connectionListener = (socket: Socket) => {
  peer.connect(socket);

  peer.readyOnce().then(() => {
    // getPeerHeaders();

    // getPeersBlocks().then((block: Block) => {
    //   const txHash = hashTx(block.transactions[0]).toString("base64");
    //   console.log("txHash", txHash);
    //   getTransactionsById(
    //     hashTx(block.transactions[0]),
    //     block.transactions[0].version === 1
    //   );
    //   // getTransactionsById();
    // });

    getPeerTransactionsByBlock();

    // getPeerTransactionsByTx();
  });
};

const testIt = () => {
  const socket: Socket = connectNet({ port: 8333, host: dnsSeeds[0] }, () => {
    connectionListener(socket);
  });
};

testIt();
