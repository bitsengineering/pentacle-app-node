import { Block, GetHeadersParam, Header, Opts, Transaction } from "../model";
import { nullHash } from "./constants";
import { INVENTORY } from "./enum";
import { PeerBase } from "./PeerBase";

export class Peer extends PeerBase {
  private bufferHash(hash: string, reverse = true) {
    return reverse ? Buffer.from(hash, "hex").reverse() : Buffer.from(hash, "hex");
  }

  getHeaders(blockHashes: string[], stopBlockHash?: string): Promise<Header[][]> {
    const getHeadersParams: GetHeadersParam = {
      version: this.protocolVersion,
      locator: blockHashes.map((blockHash) => this.bufferHash(blockHash)),
      hashStop: stopBlockHash ? this.bufferHash(stopBlockHash) : nullHash,
    };

    return this.send<Header[]>("getheaders", ["headers"], getHeadersParams);
  }

  getBlocks(hashes: string[], merkle = false): Promise<Block[]> {
    console.log("getBlocks");

    const eventNames = hashes.map((hash) => {
      let eventName = merkle ? "merkleblock" : "block";
      eventName += `:${this.bufferHash(hash).toString("base64")}`;
      console.log("getBlocks event", eventName);
      return eventName;
    });

    const inventory: Array<{ type: number; hash: Buffer }> = hashes.map((hash: string) => {
      return {
        type: merkle ? INVENTORY.MSG_FILTERED_BLOCK : INVENTORY.MSG_BLOCK,
        hash: this.bufferHash(hash),
      };
    });

    return this.send<Block>("getdata", eventNames, inventory);
  }

  getTransactionsByTx(txids: string[], witness = false): Promise<Transaction[]> {
    const eventNames = txids.map((txid: string) => {
      const eventName = "tx"; // `tx:${txid.toString("base64")}`;
      console.log("TransactionsById event", eventName);
      return eventName;
    });

    const inventory = txids.map((hash: string) => {
      return { type: witness ? INVENTORY.MSG_WITNESS_TX : INVENTORY.MSG_TX, hash: this.bufferHash(hash) };
    });

    return this.send<Transaction>("getdata", eventNames, inventory);
  }

  getTransactionsByBlock(blockHashes: string[]): Promise<Transaction[][]> {
    return this.getBlocks(blockHashes).then((blocks: Block[]) => blocks.map((block: Block) => block.transactions));
  }
}
