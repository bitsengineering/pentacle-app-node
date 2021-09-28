import WizData from "@script-wiz/wiz-data";
import { Peer } from "./Peer";
import { access, readFileSync, writeFileSync } from "fs";
import { GENESIS_BLOCK_HASH } from "./constants";
import { Block, Header } from "../model";

type BlockHeader = {
  version: number;
  prevHash: Buffer;
  merkleRoot: Buffer;
  timestamp: number;
  bits: number;
  nonce: number;
  blockNumber: number;
  prevHashHex: string;
  merkleRootHex: string;
};

const readHeaders = (): BlockHeader[] => {
  const data = readFileSync("headers.json", "utf8");
  return JSON.parse(data);
};

const writeHeader = (header: BlockHeader) => {
  access("headers.json", async (notExist) => {
    if (notExist) {
      const json = JSON.stringify(header);
      writeFileSync("headers.json", json, "utf8");
    } else {
      const currentHeaders = readHeaders();
      let newHeaders = [...currentHeaders];

      const existHeaderIndex = newHeaders.findIndex((hd) => hd.prevHashHex === header.prevHashHex);
      if (existHeaderIndex === -1) {
        newHeaders.push(header);
        const json = JSON.stringify(newHeaders);
        writeFileSync("headers.json", json, "utf8");
      }
    }
  });
};

const getBlockHeaders = (peer: Peer, blockHash: string): Promise<BlockHeader[]> => {
  return peer.getHeaders([blockHash]).then((headerses: Header[][]) => {
    return headerses[0].map((headers: Header, index) => {
      return {
        ...headers.header,
        blockNumber: index + 1,
        prevHashHex: WizData.fromBytes(headers.header.prevHash.reverse()).hex,
        merkleRootHex: WizData.fromBytes(headers.header.merkleRoot.reverse()).hex,
      };
    });
  });
};

const getFirstBlockHeader = (peer: Peer): Promise<BlockHeader> => {
  return peer.getBlocks([GENESIS_BLOCK_HASH]).then((blocks: Block[]) => {
    return {
      ...blocks[0].header,
      blockNumber: 0,
      prevHashHex: WizData.fromBytes(blocks[0].header.prevHash.reverse()).hex,
      merkleRootHex: WizData.fromBytes(blocks[0].header.merkleRoot.reverse()).hex,
    };
  });
};

export const storeHeaders = async (peer: Peer) => {
  const firstHeader = await getFirstBlockHeader(peer);
  writeHeader(firstHeader);
};
