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
  transactions: Array<Transaction>;
};

export default Block;
