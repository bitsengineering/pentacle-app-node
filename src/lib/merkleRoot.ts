import { bin2hex, hex2bin, sha256, swapendian } from "./utils";

const merklerootbinary = (txids: string[]): string => {
  let merkleroot;

  if (txids.length == 1) {
    merkleroot = txids[0];

    return merkleroot;
  } else {
    let pairhashes: string[] = [];
    while (txids.length > 0) {
      if (txids.length >= 2) {
        const pair_first = txids[0];
        const pair_second = txids[1];

        const pair = bin2hex(pair_first + pair_second);
        const sha256Result = hex2bin(sha256(sha256(pair)));

        pairhashes.push(sha256Result);

        txids.splice(0, 2);
      }

      if (txids.length == 1) {
        const pair_first = txids[0];
        const pair_second = txids[0];

        const pair = bin2hex(pair_first + pair_second);
        const sha256Result = hex2bin(sha256(sha256(pair)));

        pairhashes.push(sha256Result);

        txids.splice(0, 1);
      }
    }

    return merklerootbinary(pairhashes);
  }
};

export const merkleroot = (txids: string[]) => {
  let txidsLE: string[] = [];
  let txidsLEbinary: string[] = [];
  let merkleroot;

  // Convert txids in to little endian.
  txids.forEach((txid) => {
    txidsLE.push(swapendian(txid));
  });

  //   Now convert each of these txids in to binary, because the hash function wants the binary value, not the hex.
  txidsLE.forEach((txidBE) => {
    txidsLEbinary.push(hex2bin(txidBE));
  });

  // Work out the merkle root (in binary).
  merkleroot = merklerootbinary(txidsLEbinary);

  // Convert the merkle root in to hexadecimal and little-endian.
  merkleroot = swapendian(bin2hex(merkleroot));

  return merkleroot;
};
