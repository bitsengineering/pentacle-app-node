import { createHash } from "crypto";
import { ServiceBit, Transaction } from "../model";
import { serviceBits } from "./constants";
import CryptoJS from "crypto-js";

// const encodeHeader = require("bitcoin-protocol").types.header.encode;
// const encodeTx = require("bitcoin-protocol").types.transaction.encode;

// export const sha256 = (data: any) => createHash("sha256").update(data).digest();

// export const hashBlock = (header: any): Buffer => sha256(sha256(encodeHeader(header)));
// export const hashTx = (tx: Transaction): Buffer => sha256(sha256(encodeTx(tx)));

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

export const sha256 = (hex: string): string => {
  return CryptoJS.SHA256(CryptoJS.enc.Hex.parse(hex)).toString();
};

export const hex2bin = (hex: string) => {
  const validHex = (hex: string) => hex.length % 2 === 0 && !/[^a-fA-F0-9]/u.test(hex);
  const lookup = {
    "0": "0000",
    "1": "0001",
    "2": "0010",
    "3": "0011",
    "4": "0100",
    "5": "0101",
    "6": "0110",
    "7": "0111",
    "8": "1000",
    "9": "1001",
    a: "1010",
    b: "1011",
    c: "1100",
    d: "1101",
    e: "1110",
    f: "1111",
    A: "1010",
    B: "1011",
    C: "1100",
    D: "1101",
    E: "1110",
    F: "1111",
  };

  if (!validHex(hex)) {
    throw "invalid hex string";
  } else {
    let result = "";
    for (let i = 0, len = hex.length; i < len; i++) {
      result += (lookup as any)[hex[i]];
    }
    return result;
  }
};

export const bin2hex = (bin: string) => {
  let i,
    k,
    part,
    accum,
    ret = "";
  for (i = bin.length - 1; i >= 3; i -= 4) {
    // extract out in substrings of 4 and convert to hex
    part = bin.substr(i + 1 - 4, 4);
    accum = 0;
    for (k = 0; k < 4; k += 1) {
      if (part[k] !== "0" && part[k] !== "1") {
        // invalid character
        throw "invalid bin character";
      }
      // compute the length 4 substring
      accum = accum * 2 + parseInt(part[k], 10);
    }
    if (accum >= 10) {
      // 'A' to 'F'
      ret = String.fromCharCode(accum - 10 + "A".charCodeAt(0)) + ret;
    } else {
      // '0' to '9'
      ret = String(accum) + ret;
    }
  }
  // remaining characters, i = 0, 1, or 2
  if (i >= 0) {
    accum = 0;
    // convert from front
    for (k = 0; k <= i; k += 1) {
      if (bin[k] !== "0" && bin[k] !== "1") {
        throw "invalid bin character";
      }
      accum = accum * 2 + parseInt(bin[k], 10);
    }
    // 3 bits, value cannot exceed 2^3 - 1 = 7, just convert
    ret = String(accum) + ret;
  }
  return ret;
};

export const swapendian = (data: string) => Buffer.from(data, "hex").reverse().toString("hex");
