"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.difficultyIndex = exports.bitsToTarget = exports.targetToBits = exports.blockHeaderPeriodVerify = exports.blockHeaderSingleVerify = void 0;
const wiz_data_1 = __importDefault(require("@script-wiz/wiz-data"));
const bigInt = require("big-integer");
const twoWeekSec = 1209600;
const maxTargetHex = 0x1d00ffff;
const blockHeaderSingleVerify = (initialBlock, willVerifyBlock) => {
    const currentTarget = (0, exports.bitsToTarget)(initialBlock.bits);
    const blockHashInt = bigInt(parseInt(willVerifyBlock.hash, 16));
    if (currentTarget.compare(blockHashInt) !== 1) {
        return false;
    }
    return true;
};
exports.blockHeaderSingleVerify = blockHeaderSingleVerify;
// n. block için (n + 1) % 2016 = 1 için
const blockHeaderPeriodVerify = (prevBlockHeader, currentBlockHeader, nextBlock) => {
    const timeDiff = currentBlockHeader.timestamp - prevBlockHeader.timestamp;
    const currentTargetValue = (0, exports.bitsToTarget)(currentBlockHeader.bits);
    const timeDiffValue = bigInt(timeDiff);
    const multiplyDifference = currentTargetValue.multiply(timeDiffValue);
    const divResultToTwoWeek = multiplyDifference.divide(bigInt(twoWeekSec));
    const maximumTargetValue = (0, exports.bitsToTarget)(maxTargetHex);
    let newBits;
    if (divResultToTwoWeek.compare(maximumTargetValue) === 1) {
        newBits = maxTargetHex;
    }
    else {
        newBits = parseInt((0, exports.targetToBits)(divResultToTwoWeek.toString()), 16);
    }
    if (nextBlock.bits !== newBits) {
        return false;
    }
    const newTarget = (0, exports.bitsToTarget)(newBits);
    const blockHashInt = bigInt(parseInt(nextBlock.hash, 16));
    if (newTarget.compare(blockHashInt) !== 1) {
        return false;
    }
    return true;
};
exports.blockHeaderPeriodVerify = blockHeaderPeriodVerify;
const targetToBits = (input) => {
    const wizData = wiz_data_1.default.fromNumber(Number(input));
    const wizDataBytes = new Uint8Array([...wizData.bytes, wizData.bytes.length]);
    const compactUInt8Array = wizDataBytes.slice(-4);
    const compactHexArray = [];
    compactUInt8Array.forEach((u) => {
        let newVal = u.toString(16);
        if (newVal === "0")
            newVal = "00";
        compactHexArray.push(newVal);
    });
    return compactHexArray.reverse().join("");
};
exports.targetToBits = targetToBits;
const bitsToTarget = (bitsInput) => {
    let bits = bigInt(bitsInput);
    var sign = bits.and(0x00800000).shiftRight(24).toJSNumber();
    var exponent = bits.and(0xff000000).shiftRight(24).toJSNumber(); // first byte ?
    var mantissa = bits.and(0x007fffff);
    var target = mantissa.times(Math.pow(-1, sign)).shiftLeft(8 * (exponent - 3));
    return target;
};
exports.bitsToTarget = bitsToTarget;
const difficultyIndex = (target) => {
    const limit = bigInt("00000000FFFF0000000000000000000000000000000000000000000000000000", 16);
    const targetValue = bigInt(target, 16);
    const difficultyIndex = limit.divide(targetValue);
    return difficultyIndex;
};
exports.difficultyIndex = difficultyIndex;
//# sourceMappingURL=feat.js.map