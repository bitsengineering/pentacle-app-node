"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderManagement = void 0;
const wiz_data_1 = __importDefault(require("@script-wiz/wiz-data"));
const fs_1 = require("fs");
const constants_1 = require("./constants");
const feat_1 = require("./feat");
class HeaderManagement {
    peer;
    constructor(newPeer) {
        this.peer = newPeer;
    }
    readHeaders = () => {
        const data = (0, fs_1.readFileSync)("headers.json", "utf8");
        return JSON.parse(data);
    };
    writeHeader = (header, initial) => {
        const currentHeaders = initial
            ? []
            : this.readHeaders().sort((a, b) => {
                return a.blockNumber - b.blockNumber;
            });
        let newHeaders = [...currentHeaders];
        newHeaders.push(header);
        const json = JSON.stringify(newHeaders);
        (0, fs_1.writeFileSync)("headers.json", json, "utf8");
    };
    getBlockHeaders = async (blockHash, lastBlockNumber) => {
        const headerses = await this.peer.getHeaders([blockHash]);
        return headerses[0].slice(0, -1).map((headers, index) => {
            return {
                ...headers.header,
                blockNumber: index + lastBlockNumber,
                prevHashHex: wiz_data_1.default.fromBytes(headers.header.prevHash).hex,
                merkleRootHex: wiz_data_1.default.fromBytes(headers.header.merkleRoot.reverse()).hex,
                hash: wiz_data_1.default.fromBytes(headerses[0][index + 1].header.prevHash.reverse()).hex,
            };
        });
    };
    getFirstBlockHeader = async () => {
        const blocks = await this.peer.getBlocks([constants_1.GENESIS_BLOCK_HASH]);
        return {
            ...blocks[0].header,
            blockNumber: 0,
            prevHashHex: wiz_data_1.default.fromBytes(blocks[0].header.prevHash.reverse()).hex,
            merkleRootHex: wiz_data_1.default.fromBytes(blocks[0].header.merkleRoot.reverse()).hex,
            hash: constants_1.GENESIS_BLOCK_HASH,
        };
    };
    storeHeaders = async () => {
        // writeHeader(firstHeader);
        (0, fs_1.access)("headers.json", async (notExist) => {
            if (notExist) {
                const firstHeader = await this.getFirstBlockHeader();
                this.writeHeader(firstHeader, true);
            }
            else {
                const currentHeaders = this.readHeaders().sort((a, b) => {
                    return a.blockNumber - b.blockNumber;
                });
                let lastBlockHash = "";
                let lastBlockNumber = 0;
                if (currentHeaders.length === 1) {
                    lastBlockHash = constants_1.GENESIS_BLOCK_HASH;
                }
                else {
                    lastBlockHash = currentHeaders[currentHeaders.length - 1].hash;
                    lastBlockNumber = currentHeaders[currentHeaders.length - 1].blockNumber;
                }
                const blockHeaders = await this.getBlockHeaders(lastBlockHash, lastBlockNumber + 1);
                blockHeaders.forEach((blockHeader, index) => {
                    if (index === 0) {
                        const isVerify = (0, feat_1.blockHeaderSingleVerify)(currentHeaders[currentHeaders.length - 1], blockHeader);
                        console.log("1");
                        if (isVerify) {
                            console.log("2");
                            this.writeHeader(blockHeader);
                        }
                        else {
                            throw "Verify Error";
                        }
                    }
                    else {
                        const isVerify = (0, feat_1.blockHeaderSingleVerify)(blockHeaders[index - 1], blockHeader);
                        console.log("3");
                        if (isVerify) {
                            console.log("4");
                            this.writeHeader(blockHeader);
                        }
                        else {
                            throw "Verify Error";
                        }
                    }
                });
            }
        });
    };
}
exports.HeaderManagement = HeaderManagement;
//# sourceMappingURL=headerManagement.js.map