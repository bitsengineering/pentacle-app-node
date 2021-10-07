"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManagement = void 0;
const fs_1 = require("fs");
class TransactionManagement {
    peer;
    constructor(newPeer) {
        this.peer = newPeer;
    }
    getPeerTransactionsByBlock = async (blockHashes) => {
        try {
            const transactions = await this.peer.getTransactionsByBlock(blockHashes);
            let totalIns = [];
            // let totalOuts : Out[] = [];
            transactions[0].forEach((tx) => {
                tx.ins.forEach((value) => {
                    totalIns.push(value);
                });
                // tx.outs.forEach((value: any) => {
                //   totalOuts.push(value)
                // })
            });
            return totalIns;
        }
        catch (error) {
            console.log("getTransactionsByBlock catch");
            console.log(error);
        }
    };
    readHeaders = () => {
        const data = (0, fs_1.readFileSync)("headers.json", "utf8");
        return JSON.parse(data);
    };
    getTransactions = async (blockHashes) => {
        const transactions = await this.getPeerTransactionsByBlock(blockHashes);
        return transactions;
    };
}
exports.TransactionManagement = TransactionManagement;
//# sourceMappingURL=transactionManagement.js.map