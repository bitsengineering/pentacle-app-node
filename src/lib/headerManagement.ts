import WizData from "@script-wiz/wiz-data";
import { Peer } from "./Peer";
import { access, readFileSync, writeFileSync } from "fs";
import { GENESIS_BLOCK_HASH } from "./constants";
import { Block, Header } from "../model";
import { BlockHeader } from "../model/BlockHeader";

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
    const currentHeaders = initial
      ? []
      : this.readHeaders().sort((a, b) => {
          return a.blockNumber - b.blockNumber;
        });
    let newHeaders = [...currentHeaders];

    newHeaders.push(header);
    const json = JSON.stringify(newHeaders);
    writeFileSync("headers.json", json, "utf8");
  };

  getBlockHeaders = async (blockHash: string, lastBlockNumber: number): Promise<BlockHeader[]> => {
    const headerses = await this.peer.getHeaders([blockHash]);
    return headerses[0].map((headers: Header, index) => {
      return {
        ...headers.header,
        blockNumber: index + lastBlockNumber,
        prevHashHex: WizData.fromBytes(headers.header.prevHash.reverse()).hex,
        merkleRootHex: WizData.fromBytes(headers.header.merkleRoot.reverse()).hex,
        hash: index + 1 !== headerses[0].length ? WizData.fromBytes(headerses[0][index + 1].header.prevHash.reverse()).hex : "",
      };
    });
  };

  getFirstBlockHeader = async (): Promise<BlockHeader> => {
    const blocks = await this.peer.getBlocks([GENESIS_BLOCK_HASH]);
    return {
      ...blocks[0].header,
      blockNumber: 0,
      prevHashHex: WizData.fromBytes(blocks[0].header.prevHash.reverse()).hex,
      merkleRootHex: WizData.fromBytes(blocks[0].header.merkleRoot.reverse()).hex,
      hash: GENESIS_BLOCK_HASH,
    };
  };

  storeHeaders = async () => {
    // writeHeader(firstHeader);
    access("headers.json", async (notExist) => {
      if (notExist) {
        const firstHeader = await this.getFirstBlockHeader();
        this.writeHeader(firstHeader, true);
      } else {
        const currentHeaders = this.readHeaders().sort((a, b) => {
          return a.blockNumber - b.blockNumber;
        });

        // let newHeaders = [...currentHeaders];
        let lastBlockHash = "";
        let lastBlockNumber = 0;

        if (currentHeaders.length === 1) {
          lastBlockHash = GENESIS_BLOCK_HASH;
        } else {
          lastBlockHash = currentHeaders[currentHeaders.length - 1].prevHashHex;
          lastBlockNumber = currentHeaders[currentHeaders.length - 1].blockNumber;
        }

        const blockHeaders = await this.getBlockHeaders(lastBlockHash, lastBlockNumber + 1);

        blockHeaders.forEach((blockHeader: BlockHeader) => {
          this.writeHeader(blockHeader);
        });
      }
    });
  };
}
