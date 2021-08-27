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
  version: 1;
  ins: Array<In>;
  outs: Array<Out>;
  locktime: 0;
};

export default Transaction;
