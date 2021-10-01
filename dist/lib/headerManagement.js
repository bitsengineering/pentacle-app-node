"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderManagement = void 0;
const wiz_data_1 = __importDefault(require("@script-wiz/wiz-data"));
const fs_1 = require("fs");
const constants_1 = require("./constants");
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
        const currentHeaders = initial ? [] : this.readHeaders();
        let newHeaders = [...currentHeaders];
        newHeaders.push(header);
        const json = JSON.stringify(newHeaders);
        (0, fs_1.writeFileSync)("headers.json", json, "utf8");
        // const existHeaderIndex = newHeaders.findIndex((hd) => hd.merkleRoot === header.merkleRoot);
        // if (existHeaderIndex === -1) {
        //   newHeaders.push(header);
        //   const json = JSON.stringify(newHeaders);
        //   writeFileSync("headers.json", json, "utf8");
        // }
    };
    getBlockHeaders = async (blockHash, lastBlockNumber) => {
        const headerses = await this.peer.getHeaders([blockHash]);
        return headerses[0].map((headers, index) => {
            return {
                ...headers.header,
                blockNumber: index + lastBlockNumber,
                prevHashHex: wiz_data_1.default.fromBytes(headers.header.prevHash.reverse()).hex,
                merkleRootHex: wiz_data_1.default.fromBytes(headers.header.merkleRoot.reverse()).hex,
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
                const currentHeaders = this.readHeaders();
                // let newHeaders = [...currentHeaders];
                let lastBlockHash = "";
                let lastBlockNumber = 0;
                if (currentHeaders.length === 1) {
                    lastBlockHash = constants_1.GENESIS_BLOCK_HASH;
                }
                else {
                    lastBlockHash = currentHeaders[currentHeaders.length - 1].prevHashHex;
                    lastBlockNumber = currentHeaders[currentHeaders.length - 1].blockNumber;
                }
                const blockHeaders = await this.getBlockHeaders(lastBlockHash, lastBlockNumber + 1);
                blockHeaders.forEach((blockHeader) => {
                    this.writeHeader(blockHeader);
                });
            }
        });
    };
}
exports.HeaderManagement = HeaderManagement;
//# sourceMappingURL=headerManagement.js.map