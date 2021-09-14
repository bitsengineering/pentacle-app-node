import { Peer } from "./lib";
import { Socket, connect as connectNet } from "net";
import { Block, Header } from "./model";
import { dnsSeeds, GENESIS_BLOCK_HASH } from "./lib/constants";

const peer = new Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, {});

const getPeerHeaders = () => {
  console.log("getPeerHeaders");

  const hashes: Buffer[] = [Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse()];

  peer
    .getHeaders(hashes)
    .then((headerses: Array<Array<Header>>) => {
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
    Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse(),
    Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse(),
  ];
  const merkle: boolean = false;

  peer
    .getBlocks(hashes, merkle)
    .then((blocksArray: Block[]) => {
      console.log("blocksArray then");
      console.log(blocksArray.length);
      console.log("blocks header.prevHash", blocksArray[0].header.prevHash);
      console.log("blocks transactions.length", blocksArray[0].transactions.length);
    })
    .catch((error) => {
      console.log("blocksArray catch");
      console.log(error);
    });
};

const connectionListener = (socket: Socket) => {
  peer.connect(socket);

  peer.readyOnce().then(() => {
    // getPeerHeaders();

    getPeersBlocks();
  });
};

const testIt = () => {
  const socket: Socket = connectNet({ port: 8333, host: dnsSeeds[0] }, () => {
    connectionListener(socket);
  });
};

testIt();
