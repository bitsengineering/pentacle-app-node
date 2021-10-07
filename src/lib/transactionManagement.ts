import { readFileSync } from "fs";
import { Transaction } from "../model";
import { BlockHeader } from "../model/BlockHeader";
import { In } from "../model/Transaction";
import { Peer } from "./Peer";

export class TransactionManagement {
  peer: Peer;

  constructor(newPeer: Peer) {
    this.peer = newPeer;
  }

  private getPeerTransactionsByBlock = async (blockHashes: string[]): Promise<In[] | undefined> => {
    try {
      const transactions = await this.peer.getTransactionsByBlock(blockHashes);
      let totalIns: In[] = [];
      // let totalOuts : Out[] = [];

      transactions[0].forEach((tx: Transaction) => {
        tx.ins.forEach((value: In) => {
          totalIns.push(value);
        });
        // tx.outs.forEach((value: any) => {
        //   totalOuts.push(value)
        // })
      });

      return totalIns;
    } catch (error) {
      console.log("getTransactionsByBlock catch");
      console.log(error);
    }
  };

  private readHeaders = (): BlockHeader[] => {
    const data = readFileSync("headers.json", "utf8");
    return JSON.parse(data);
  };

  getTransactions = async (blockHashes: string[]): Promise<In[] | undefined> => {
    const transactions = await this.getPeerTransactionsByBlock(blockHashes);

    return transactions;
  };
}
