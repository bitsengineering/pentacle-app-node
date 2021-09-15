import { ServiceBit } from "../model";

export const magic: number = 0xd9b4bef9;

export const defaultPort: number = 8333;

export const nullHash: Buffer = Buffer.from("0000000000000000000000000000000000000000000000000000000000000000", "hex");

export const SERVICES_SPV: Buffer = Buffer.from("0800000000000000", "hex");

export const SERVICES_FULL: Buffer = Buffer.from("0100000000000000", "hex");

export const INITIAL_PING_N: number = 4; // send this many pings when we first connect

export const BLOOMSERVICE_VERSION: number = 70011;

export const INITIAL_PING_INTERVAL: number = 250; // wait this many ms between initial pings

export const MIN_TIMEOUT: number = 4000; // lower bound for timeouts (in case latency is low)

export const LATENCY: number = 2 * 1000;

export const DEFAULT_TIMEOUT: number = MIN_TIMEOUT + LATENCY * 10;

export const serviceBits: ServiceBit[] = [
  { key: "NODE_NETWORK", value: 0 },
  { key: "NODE_GETUTXO", value: 1 },
  { key: "NODE_BLOOM", value: 2 },
  { key: "NODE_WITNESS", value: 3 },
  { key: "NODE_NETWORK_LIMITED", value: 10 },
];

export const GENESIS_BLOCK_HASH = "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";

export const dnsSeeds: string[] = [
  "seed.bitcoin.sipa.be",
  "dnsseed.bluematt.me",
  "dnsseed.bitcoin.dashjr.org",
  "seed.bitcoinstats.com",
  "seed.bitnodes.io",
  "bitseed.xf2.org",
  "seed.bitcoin.jonasschnelli.ch",
];
