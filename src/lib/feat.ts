import { BigInteger } from "big-integer";

const bigInt = require("big-integer");

const currentTarget = 0x1d00ffff;

const twoWeekSec = 1209600;

export const difficultyVerify = (prevTimestamp: number, currentTimestamp: number): BigInteger => {
  // 2 week
  const timeDiff = currentTimestamp - prevTimestamp;

  const currentTargetValue = bitsToTarget(currentTarget);

  const timeDiffValue = bigInt(timeDiff);

  const multiplyDifference = currentTargetValue.multiply(timeDiffValue);

  const divResultToTwoWeek = multiplyDifference.divide(bigInt(twoWeekSec));

  const difficultyIndexResult = difficultyIndex(divResultToTwoWeek.toString(16));

  // compare with 1
  return difficultyIndexResult;
};

export const bitsToTarget = (bitsInput: number): BigInteger => {
  let bits: BigInteger = bigInt(bitsInput);

  var sign = bits.and(0x00800000).shiftRight(24).toJSNumber();

  var exponent = bits.and(0xff000000).shiftRight(24).toJSNumber();

  var mantissa = bits.and(0x007fffff);

  var target = mantissa.times(Math.pow(-1, sign)).shiftLeft(8 * (exponent - 3));

  return target;
};

export const difficultyIndex = (target: string): BigInteger => {
  const limit = bigInt("00000000FFFF0000000000000000000000000000000000000000000000000000", 16);
  const targetValue = bigInt(target, 16);

  const difficultyIndex: BigInteger = limit.divide(targetValue).toJSNumber();

  return difficultyIndex;
};