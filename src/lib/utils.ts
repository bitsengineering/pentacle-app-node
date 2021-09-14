import { createHash } from "crypto";
import { ServiceBit, Transaction } from "../model";
import { serviceBits } from "./constants";

const sha256 = (data: any) => createHash("sha256").update(data).digest();

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
