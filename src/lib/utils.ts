import * as url from "url";
import { createHash } from "crypto";
const encodeHeader = require("bitcoin-protocol").types.header.encode;
const encodeTx = require("bitcoin-protocol").types.transaction.encode;

export const getRandom = (array: Array<any>) => {
  return array[Math.floor(Math.random() * array.length)];
};

export const parseAddress = (address: string) => {
  // if address has a protocol in it, we don't need to add a fake one
  if (/^\w+:\/\//.test(address)) return url.parse(address);
  return url.parse("x://" + address);
};

export const assertParams = (params: any) => {
  // TODO: check more things
  // TODO: give more specific errors
  if (!params || params.magic == null || !params.defaultPort) {
    throw new Error("Invalid network parameters");
  }
};

export const sha256 = (data: any) => {
  return createHash("sha256").update(data).digest();
};

export const getBlockHash = (header: any) => {
  let headerBytes = encodeHeader(header);
  return sha256(sha256(headerBytes));
};

export const getTxHash = (tx: any) => {
  let txBytes = encodeTx(tx);
  return sha256(sha256(txBytes));
};
