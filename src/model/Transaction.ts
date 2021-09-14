type Out = {
  value: number;
  script: Buffer;
};

type In = {
  hash: Buffer;
  index: number;
  script: Buffer;
  sequence: number;
};

type Transaction = {
  version: 1 | 2;
  ins: Array<In>;
  marker?: uint8; // witness transaction value = 0
  flag?: uint8; // witness transaction value = 1
  outs: Array<Out>;
  locktime: 0;
};

export default Transaction;
