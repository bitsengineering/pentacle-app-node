export type Out = {
  value: number;
  script: Buffer;
};

export type In = {
  hash: Buffer;
  index: number;
  script: Buffer;
  sequence: number;
};

export type Transaction = {
  version: 1 | 2;
  ins: In[];
  marker?: uint8; // witness transaction value = 0
  flag?: uint8; // witness transaction value = 1
  outs: Out[];
  locktime: 0;
};

