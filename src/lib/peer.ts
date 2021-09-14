import { Block, GetHeadersParam, Header, Opts } from "../model";
import { nullHash } from "./constants";
import { INVENTORY } from "./enum";
import { PeerBase } from "./PeerBase";

export class Peer extends PeerBase {
  getHeaders(locator: Buffer[], opts: Opts = {}): Promise<Header[][]> {
    const getHeadersParams: GetHeadersParam = {
      version: this.protocolVersion,
      locator,
      hashStop: opts.stop || nullHash,
    };

    return this.send<Header[]>("getheaders", ["headers"], getHeadersParams, opts.timeout);
  }

  getBlocks(hashes: Buffer[], merkle = false): Promise<Block[]> {
    console.log("getBlocks");

    const eventNames = hashes.map((hash) => {
      let eventName = merkle ? "merkleblock" : "block";
      eventName += `:${hash.toString("base64")}`;
      console.log("getBlocks event", eventName);
      return eventName;
    });

    const inventory: Array<{ type: number; hash: Buffer }> = hashes.map((hash: Buffer) => {
      return {
        type: merkle ? INVENTORY.MSG_FILTERED_BLOCK : INVENTORY.MSG_BLOCK,
        hash,
      };
    });

    return this.send<Block>("getdata", eventNames, inventory);
  }
}
