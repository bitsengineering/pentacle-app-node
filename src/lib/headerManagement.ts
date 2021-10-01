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

export class HeaderManagement {
  peer!: Peer;

  constructor(newPeer: Peer) {
    this.peer = newPeer;
  }

  private readHeaders = (): BlockHeader[] => {
    const data = readFileSync("headers.json", "utf8");
    return JSON.parse(data);
  };

  private writeHeader = (header: BlockHeader, initial?: boolean) => {
    const currentHeaders = initial ? [] : this.readHeaders();
    let newHeaders = [...currentHeaders];

    newHeaders.push(header);
    const json = JSON.stringify(newHeaders);
    writeFileSync("headers.json", json, "utf8");

    // const existHeaderIndex = newHeaders.findIndex((hd) => hd.merkleRoot === header.merkleRoot);
    // if (existHeaderIndex === -1) {
    //   newHeaders.push(header);
    //   const json = JSON.stringify(newHeaders);
    //   writeFileSync("headers.json", json, "utf8");
    // }
  };

  getBlockHeaders = (blockHash: string): Promise<BlockHeader[]> => {
    return this.peer.getHeaders([blockHash]).then((headerses: Header[][]) => {
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

  getFirstBlockHeader = (): Promise<BlockHeader> => {
    return this.peer.getBlocks([GENESIS_BLOCK_HASH]).then((blocks: Block[]) => {
      return {
        ...blocks[0].header,
        blockNumber: 0,
        prevHashHex: WizData.fromBytes(blocks[0].header.prevHash.reverse()).hex,
        merkleRootHex: WizData.fromBytes(blocks[0].header.merkleRoot.reverse()).hex,
      };
    });
  };

  storeHeaders = async () => {
    // writeHeader(firstHeader);
    access("headers.json", async (notExist) => {
      if (notExist) {
        const firstHeader = await this.getFirstBlockHeader();
        this.writeHeader(firstHeader, true);
      } else {
        const currentHeaders = this.readHeaders();
        // let newHeaders = [...currentHeaders];
        let lastBlockHash = "";
        if (currentHeaders.length === 1) {
          lastBlockHash = GENESIS_BLOCK_HASH;
        } else {
          lastBlockHash = currentHeaders[currentHeaders.length - 1].prevHashHex;
        }
        const blockHeaders = await this.getBlockHeaders(lastBlockHash);

        blockHeaders.forEach((blockHeader: BlockHeader) => {
          this.writeHeader(blockHeader);
        });
      }
    });
  };
}
