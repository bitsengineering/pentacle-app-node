"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeHeaders = void 0;
const wiz_data_1 = __importDefault(require("@script-wiz/wiz-data"));
const fs_1 = require("fs");
const constants_1 = require("./constants");
const readHeaders = () => {
    const data = (0, fs_1.readFileSync)("headers.json", "utf8");
    return JSON.parse(data);
};
const writeHeader = (header) => {
    (0, fs_1.access)("headers.json", async (notExist) => {
        if (notExist) {
            const json = JSON.stringify(header);
            (0, fs_1.writeFileSync)("headers.json", json, "utf8");
        }
        else {
            const currentHeaders = readHeaders();
            let newHeaders = [...currentHeaders];
            const existHeaderIndex = newHeaders.findIndex((hd) => hd.prevHashHex === header.prevHashHex);
            if (existHeaderIndex === -1) {
                newHeaders.push(header);
                const json = JSON.stringify(newHeaders);
                (0, fs_1.writeFileSync)("headers.json", json, "utf8");
            }
        }
    });
};
const getBlockHeaders = (peer, blockHash) => {
    return peer.getHeaders([blockHash]).then((headerses) => {
        return headerses[0].map((headers, index) => {
            return {
                ...headers.header,
                blockNumber: index + 1,
                prevHashHex: wiz_data_1.default.fromBytes(headers.header.prevHash.reverse()).hex,
                merkleRootHex: wiz_data_1.default.fromBytes(headers.header.merkleRoot.reverse()).hex,
            };
        });
    });
};
const getFirstBlockHeader = (peer) => {
    return peer.getBlocks([constants_1.GENESIS_BLOCK_HASH]).then((blocks) => {
        return {
            ...blocks[0].header,
            blockNumber: 0,
            prevHashHex: wiz_data_1.default.fromBytes(blocks[0].header.prevHash.reverse()).hex,
            merkleRootHex: wiz_data_1.default.fromBytes(blocks[0].header.merkleRoot.reverse()).hex,
        };
    });
};
const storeHeaders = async (peer) => {
    const firstHeader = await getFirstBlockHeader(peer);
    writeHeader(firstHeader);
};
exports.storeHeaders = storeHeaders;
//# sourceMappingURL=headerManagement.js.map