const bigInt = require("big-integer");

const currentTarget = 0x1d00ffff;

const twoWeekSec = 1209600;

export const difficuiltyVerify = (prevTimestamp: number, currentTimestamp: number) => {
  // 2 week
  const timeDiff = currentTimestamp - prevTimestamp;

  const currentTargetValue = bitsToTarget(currentTarget);

  const multiplyDifference = bigInt(Number(currentTargetValue.value) * timeDiff).value;
};

const bitsToTarget = (bitsInput: number): { value: number } => {
  let bits = bigInt(bitsInput);

  var sign = bits.and(0x00800000).shiftRight(24).toJSNumber();

  var exponent = bits.and(0xff000000).shiftRight(24).toJSNumber();

  var mantissa = bits.and(0x007fffff);

  var target = mantissa.times(Math.pow(-1, sign)).shiftLeft(8 * (exponent - 3));

  return target;
};
