import Transaction from "./Transaction";

type Block = {
  header: {
    version: number;
    prevHash: Buffer;
    merkleRoot: Buffer;
    timestamp: number;
    bits: number;
    nonce: number;
  };
  transactions: Transaction[];
};

export default Block;
