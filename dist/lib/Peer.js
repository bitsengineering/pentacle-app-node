"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Peer = void 0;
const constants_1 = require("./constants");
const enum_1 = require("./enum");
const PeerBase_1 = require("./PeerBase");
class Peer extends PeerBase_1.PeerBase {
    bufferHash(hash, reverse = true) {
        return reverse ? Buffer.from(hash, "hex").reverse() : Buffer.from(hash, "hex");
    }
    getHeaders(blockHashes, stopBlockHash) {
        const getHeadersParams = {
            version: this.protocolVersion,
            locator: blockHashes.map((blockHash) => this.bufferHash(blockHash)),
            hashStop: stopBlockHash ? this.bufferHash(stopBlockHash) : constants_1.nullHash,
        };
        return this.send("getheaders", ["headers"], getHeadersParams);
    }
    getBlocks(hashes, merkle = false) {
        // console.log("getBlocks");
        const eventNames = hashes.map((hash) => {
            let eventName = merkle ? "merkleblock" : "block";
            eventName += `:${this.bufferHash(hash).toString("base64")}`;
            // console.log("getBlocks event", eventName);
            return eventName;
        });
        const inventory = hashes.map((hash) => {
            return {
                type: merkle ? enum_1.INVENTORY.MSG_FILTERED_BLOCK : enum_1.INVENTORY.MSG_BLOCK,
                hash: this.bufferHash(hash),
            };
        });
        return this.send("getdata", eventNames, inventory);
    }
    getTransactionsByTx(txids, witness = false) {
        const eventNames = txids.map((txid) => {
            const eventName = "tx"; // `tx:${txid.toString("base64")}`;
            // console.log("TransactionsById event", eventName);
            return eventName;
        });
        const inventory = txids.map((hash) => {
            return { type: witness ? enum_1.INVENTORY.MSG_WITNESS_TX : enum_1.INVENTORY.MSG_TX, hash: this.bufferHash(hash) };
        });
        return this.send("getdata", eventNames, inventory);
    }
    getTransactionsByBlock(blockHashes) {
        return this.getBlocks(blockHashes).then((blocks) => blocks.map((block) => block.transactions));
    }
}
exports.Peer = Peer;
//# sourceMappingURL=Peer.js.map