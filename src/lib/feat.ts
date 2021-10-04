import WizData from "@script-wiz/wiz-data";
import { BigInteger } from "big-integer";
import { Block, Header } from "../model";
import { BlockHeader } from "../model/BlockHeader";

const bigInt = require("big-integer");

// block 32256
const testBlockHash = 0x00000004f2886a170adb7204cb0c7a824217dd24d11a74423d564c4e0904967;

const twoWeekSec = 1209600;

const maxTargetHex = 0x1d00ffff;

export const blockHeaderSingleVerify = (initialBlock: BlockHeader, willVerifyBlock: BlockHeader) => {
  const currentTarget = bitsToTarget(initialBlock.bits);

  const blockHashInt: BigInt = bigInt(parseInt(willVerifyBlock.hash, 16));

  if (currentTarget.compare(blockHashInt.valueOf()) !== 1) {
    return false;
  }

  return true;
};

// n. block için (n + 1) % 2016 = 1 için
export const blockHeaderPeriodVerify = (prevBlockHeader: Header, currentBlockHeader: Header, nextBlock?: Block): boolean => {
  // step 1 current target
  const timeDiff = currentBlockHeader.header.timestamp - prevBlockHeader.header.timestamp;

  const currentTargetValue = bitsToTarget(prevBlockHeader.header.bits);

  const timeDiffValue = bigInt(timeDiff);

  const multiplyDifference = currentTargetValue.multiply(timeDiffValue);

  const divResultToTwoWeek = multiplyDifference.divide(bigInt(twoWeekSec));

  const newBits = targetToBits(divResultToTwoWeek.toString());

  // if(nextBlockHeader.header.bits !== newBits){
  //   return false;
  // }

  // step2 new target

  const newTarget = bitsToTarget(Number("0x" + newBits));

  const blockHashInt = bigInt(testBlockHash);

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

export const bitsToTarget = (bitsInput: number): BigInteger => {
  let bits: BigInteger = bigInt(bitsInput);

  var sign = bits.and(0x00800000).shiftRight(24).toJSNumber();

  var exponent = bits.and(0xff000000).shiftRight(24).toJSNumber(); // first byte ?

  var mantissa = bits.and(0x007fffff);

  var target = mantissa.times(Math.pow(-1, sign)).shiftLeft(8 * (exponent - 3));

  return target;
};

export const difficultyIndex = (target: string): BigInteger => {
  const limit = bigInt("00000000FFFF0000000000000000000000000000000000000000000000000000", 16);
  const targetValue = bigInt(target, 16);

  const difficultyIndex: BigInteger = limit.divide(targetValue);

  return difficultyIndex;
};
