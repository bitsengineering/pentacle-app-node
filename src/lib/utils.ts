import { createHash } from "crypto";
import { ServiceBit } from "../model";
import { serviceBits } from "./constants";

const encodeHeader = require("bitcoin-protocol").types.header.encode;
const encodeTx = require("bitcoin-protocol").types.transaction.encode;

const sha256 = (data: any) => createHash("sha256").update(data).digest();

export const hashBlock = (header: any): string =>
  sha256(sha256(encodeHeader(header))).toString("base64");

export const hashTx = (tx: any): string =>
  sha256(sha256(encodeTx(tx))).toString("base64");

// export const toHexString = (byteArray: Uint8Array) => Array.from(byteArray, (byte) => ("0" + (byte & 0xff).toString(16)).slice(-2)).join("");

export const getServices = (buf: Buffer) => {
  const services: { [key: string]: boolean } = {};
  serviceBits.forEach((sr: ServiceBit) => {
    const byteIndex = Math.floor(sr.value / 8);
    const byte = buf.readUInt32LE(byteIndex);
    const bitIndex = sr.value % 8;
    if (byte & (1 << bitIndex)) {
      services[sr.key] = true;
    }
  });
  return services;
};
