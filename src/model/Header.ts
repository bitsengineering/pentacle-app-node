type Header = {
  header: {
    version: number;
    prevHash: Buffer;
    merkleRoot: Buffer;
    timestamp: number;
    bits: number;
    nonce: number;
  };
  numTransactions: Number;
};

export default Header;
