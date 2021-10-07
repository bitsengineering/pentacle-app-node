import WizData from "@script-wiz/wiz-data";
import { Peer } from "./Peer";
import { access, readFileSync, writeFileSync, promises } from "fs";
import { GENESIS_BLOCK_HASH } from "./constants";
import { Block, Header } from "../model";
import { BlockHeader } from "../model/BlockHeader";
import { blockHeaderPeriodVerify, blockHeaderSingleVerify } from "./feat";

export class HeaderManagement {
  peer: Peer;

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
    return writeFileSync("headers.json", json, "utf8");
  };

  private getBlockHeaders = async (blockHash: string, lastBlockNumber: number): Promise<BlockHeader[]> => {
    const headerses = await this.peer.getHeaders([blockHash]);

    return headerses[0].slice(0, -1).map((headers: Header, index) => {
      return {
        ...headers.header,
        blockNumber: index + lastBlockNumber,
        prevHashHex: WizData.fromBytes(headers.header.prevHash).hex,
        merkleRootHex: WizData.fromBytes(headers.header.merkleRoot.reverse()).hex,
        hash: WizData.fromBytes(headerses[0][index + 1].header.prevHash.reverse()).hex,
      };
    });
  };

  private getFirstBlockHeader = async (): Promise<BlockHeader> => {
    const blocks = await this.peer.getBlocks([GENESIS_BLOCK_HASH]);
    return {
      ...blocks[0].header,
      blockNumber: 0,
      prevHashHex: WizData.fromBytes(blocks[0].header.prevHash.reverse()).hex,
      merkleRootHex: WizData.fromBytes(blocks[0].header.merkleRoot.reverse()).hex,
      hash: GENESIS_BLOCK_HASH,
    };
  };

  private getAndWriteHeaders = async () => {
    const currentHeaders = this.readHeaders();

    const lastBlockElement = currentHeaders[currentHeaders.length - 1];

    let lastTimestamp = lastBlockElement.timestamp;

    const blockHeaders = await this.getBlockHeaders(lastBlockElement.hash, lastBlockElement.blockNumber + 1);

    blockHeaders.forEach(async (blockHeader: BlockHeader, index: number) => {
      if (blockHeader.blockNumber % 2016 === 0) {
        const prevBlock = currentHeaders[blockHeader.blockNumber - 2016];
        const currentBlock = currentHeaders[blockHeader.blockNumber - 1] ? currentHeaders[blockHeader.blockNumber - 1] : blockHeaders[index - 1];

        const isVerify = blockHeaderPeriodVerify(prevBlock, currentBlock, blockHeader);

        if (isVerify) {
          this.writeHeader(blockHeader);
        } else {
          throw "Verify Error";
        }
      } else {
        if (index === 0) {
          const isVerify = blockHeaderSingleVerify(currentHeaders[currentHeaders.length - 1], blockHeader);

          if (isVerify) {
            this.writeHeader(blockHeader);
          } else {
            throw "Verify Error";
          }
        } else {
          const isVerify = blockHeaderSingleVerify(blockHeaders[index - 1], blockHeader);

          if (isVerify) {
            this.writeHeader(blockHeader);
          } else {
            throw "Verify Error";
          }

          if (index === blockHeaders.length - 1) {
            lastTimestamp = blockHeader.timestamp;
          }
        }
      }
    });

    const now = Date.now();

    if (now > lastTimestamp) {
      this.getAndWriteHeaders();
    }
  };

  storeHeaders = async () => {
    access("headers.json", async (notExist) => {
      if (notExist) {
        const firstHeader = await this.getFirstBlockHeader();

        this.writeHeader(firstHeader, true);

        this.getAndWriteHeaders();
      } else {
        this.getAndWriteHeaders();
      }
    });
  };
}
