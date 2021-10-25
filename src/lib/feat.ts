import WizData from "@script-wiz/wiz-data";
import { BigInteger } from "big-integer";
import { BlockHeader } from "../model/BlockHeader";
import { bin2hex, hex2bin, reverseHex, sha256v2 } from "./utils";

const bigInt = require("big-integer");


const twoWeekSec = 1209600;

const maxTargetHex = 0x1d00ffff;

export const blockHeaderSingleVerify = (initialBlock: BlockHeader, willVerifyBlock: BlockHeader) => {
  const currentTarget = bitsToTarget(initialBlock.bits);

  const blockHashInt = bigInt(parseInt(willVerifyBlock.hash, 16));

  if (currentTarget.compare(blockHashInt) !== 1) {
    return false;
  }

  return true;
};

// n. block için (n + 1) % 2016 = 1 için
export const blockHeaderPeriodVerify = (prevBlockHeader: BlockHeader, currentBlockHeader: BlockHeader, nextBlock: BlockHeader): boolean => {  
  const timeDiff = currentBlockHeader.timestamp - prevBlockHeader.timestamp;

  const currentTargetValue = bitsToTarget(currentBlockHeader.bits);

  const timeDiffValue = bigInt(timeDiff);

  const multiplyDifference = currentTargetValue.multiply(timeDiffValue);

  const divResultToTwoWeek = multiplyDifference.divide(bigInt(twoWeekSec));

  const maximumTargetValue = bitsToTarget(maxTargetHex);

  let newBits;

  if (divResultToTwoWeek.compare(maximumTargetValue) === 1) {
    newBits = maxTargetHex;
  } else {
    newBits = parseInt(targetToBits(divResultToTwoWeek.toString()), 16);
  }

  if (nextBlock.bits !== newBits) {
    return false;
  }

  const newTarget = bitsToTarget(newBits);

  const blockHashInt = bigInt(parseInt(nextBlock.hash, 16));

  if (newTarget.compare(blockHashInt) !== 1) {
    return false;
  }

  return true;
};

export const targetToBits = (input: string) => {
  const wizData = WizData.fromNumber(Number(input));
  const wizDataBytes = new Uint8Array([...wizData.bytes, wizData.bytes.length]);

  const compactUInt8Array = wizDataBytes.slice(-4);

  const compactHexArray: string[] = [];
  compactUInt8Array.forEach((u: number) => {
    let newVal = u.toString(16);
    if (newVal === "0") newVal = "00";
    compactHexArray.push(newVal);
  });

  return compactHexArray.reverse().join("");
};

export const bitsToTarget = (bitsInput: number) => {
  let bits: BigInteger = bigInt(bitsInput);

  var sign = bits.and(0x00800000).shiftRight(24).toJSNumber();

  var exponent = bits.and(0xff000000).shiftRight(24).toJSNumber(); // first byte ?

  var mantissa = bits.and(0x007fffff);

  var target = mantissa.times(Math.pow(-1, sign)).shiftLeft(8 * (exponent - 3));

  return target;
};

export const difficultyIndex = (target: string) => {
  const limit = bigInt("00000000FFFF0000000000000000000000000000000000000000000000000000", 16);
  const targetValue = bigInt(target, 16);

  const difficultyIndex: BigInteger = limit.divide(targetValue);

  return difficultyIndex;
};

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

export const merkleRootVerify = (txids: string[],blockMerkleRoot:string):boolean => {
  let txidsLE: string[] = [];
  let txidsLEbinary: string[] = [];

  // Convert txids in to little endian.
  txids.forEach((txid) => {
    txidsLE.push(reverseHex(txid));
  });

  //   Now convert each of these txids in to binary, because the hash function wants the binary value, not the hex.
  txidsLE.forEach((txidLE) => {
    txidsLEbinary.push(hex2bin(txidLE));
  });

  // Work out the merkle root (in binary).
  const calculatedMerkleRootBinary = merklerootbinary(txidsLEbinary);

  // Convert the merkle root in to hexadecimal and little-endian.
  const calculatedMerkleRootHex = reverseHex(bin2hex(calculatedMerkleRootBinary));

  console.log("blockMerkleRoot",blockMerkleRoot);
  console.log("calculatedMerkleRootHex",calculatedMerkleRootHex);
  

  if (blockMerkleRoot !== calculatedMerkleRootHex) {
    return false;
  }

  return true;

};
