"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.difficultyIndex = exports.bitsToTarget = exports.targetToBits = exports.blockHeaderPeriodVerify = exports.blockHeaderSingleVerify = void 0;
const wiz_data_1 = __importDefault(require("@script-wiz/wiz-data"));
const bigInt = require("big-integer");
// block 32256
const testBlockHash = 0x00000004f2886a170adb7204cb0c7a824217dd24d11a74423d564c4e0904967;
const twoWeekSec = 1209600;
const maxTargetHex = 0x1d00ffff;
const blockHeaderSingleVerify = (initialBlock, willVerifyBlock) => {
    const currentTarget = (0, exports.bitsToTarget)(initialBlock.header.bits);
    const blockHashInt = bigInt(willVerifyBlock.header.prevHash);
    if (currentTarget.compare(blockHashInt) !== 1) {
        return false;
    }
    return true;
};
exports.blockHeaderSingleVerify = blockHeaderSingleVerify;
// n. block için (n + 1) % 2016 = 1 için
const blockHeaderPeriodVerify = (prevBlockHeader, currentBlockHeader, nextBlock) => {
    // step 1 current target
    const timeDiff = currentBlockHeader.header.timestamp - prevBlockHeader.header.timestamp;
    const currentTargetValue = (0, exports.bitsToTarget)(prevBlockHeader.header.bits);
    const timeDiffValue = bigInt(timeDiff);
    const multiplyDifference = currentTargetValue.multiply(timeDiffValue);
    const divResultToTwoWeek = multiplyDifference.divide(bigInt(twoWeekSec));
    const newBits = (0, exports.targetToBits)(divResultToTwoWeek.toString());
    // if(nextBlockHeader.header.bits !== newBits){
    //   return false;
    // }
    // step2 new target
    const newTarget = (0, exports.bitsToTarget)(Number("0x" + newBits));
    const blockHashInt = bigInt(testBlockHash);
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