import { bin2hex, hex2bin, reverseHex, sha256v2 } from "./utils";

const merklerootbinary = (txids: string[]): string => {
  let merkleroot;

  if (txids.length == 1) {
    merkleroot = txids[0];

    return merkleroot;
  } else {
    let pairHashes: string[] = [];
    while (txids.length > 0) {
      if (txids.length >= 2) {
        const hash1 = txids[0];
        const hash2 = txids[1];

        const concatHashes = bin2hex(hash1 + hash2);
        const hash256 = hex2bin(sha256v2(sha256v2(concatHashes)));

        pairHashes.push(hash256);

        txids.splice(0, 2);
      }

      if (txids.length == 1) {
        const hash1 = txids[0];
        const hash2 = txids[0];

        const concatHashes = bin2hex(hash1 + hash2);
        const hash256 = hex2bin(sha256v2(sha256v2(concatHashes)));

        pairHashes.push(hash256);

        txids.splice(0, 1);
      }
    }

    return merklerootbinary(pairHashes);
  }
};

export const merkleroot = (txids: string[]) => {
  let txidsLE: string[] = [];
  let txidsLEbinary: string[] = [];
  let merkleroot;

  // Convert txids in to little endian.
  txids.forEach((txid) => {
    txidsLE.push(reverseHex(txid));
  });

  //   Now convert each of these txids in to binary, because the hash function wants the binary value, not the hex.
  txidsLE.forEach((txidBE) => {
    txidsLEbinary.push(hex2bin(txidBE));
  });

  // Work out the merkle root (in binary).
  merkleroot = merklerootbinary(txidsLEbinary);

  // Convert the merkle root in to hexadecimal and little-endian.
  merkleroot = reverseHex(bin2hex(merkleroot));

  return merkleroot;
};
