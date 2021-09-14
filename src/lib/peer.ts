import { GetHeadersParam, Header, Opts } from "../model";
import { nullHash } from "./constants";
import { PeerBase } from "./PeerBase";

export class Peer extends PeerBase {
  getHeaders(locator: Array<Buffer>, opts: Opts = {}): Promise<Array<Array<Header>>> {
    const getHeadersParams: GetHeadersParam = {
      version: this.protocolVersion,
      locator,
      hashStop: opts.stop || nullHash,
    };

    return this.send<Array<Header>>("getheaders", ["headers"], getHeadersParams, opts.timeout);
  }
}
