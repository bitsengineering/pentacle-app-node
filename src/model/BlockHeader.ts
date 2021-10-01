export type BlockHeader = {
  version: number;
  prevHash: Buffer;
  merkleRoot: Buffer;
  timestamp: number;
  bits: number;
  nonce: number;
  blockNumber: number;
  prevHashHex: string;
  merkleRootHex: string;
};
