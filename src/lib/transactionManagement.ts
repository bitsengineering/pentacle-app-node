import { readFileSync } from "fs";
import { Transaction } from "../model";
import { BlockHeader } from "../model/BlockHeader";
import { In, Out } from "../model/Transaction";
import { Peer } from "./Peer";
import * as bitcoin from "@bitmatrix/bitcodec/bitcoin";
import { buffer2hex, reverseHex, sha256v2 } from "./utils";

export class TransactionManagement {
  peer: Peer;

  constructor(newPeer: Peer) {
    this.peer = newPeer;
  }

  private getPeerTransactionsByBlock = async (blockHashes: string[]) => {
    try {
      const transactions = await this.peer.getTransactionsByBlock(blockHashes);
      let txIds: any = [];

      transactions[0].forEach((tx: Transaction) => {
        const txIns = tx.ins.map((txIn: In) => {
          return {
            previousOutput: {
              hash: buffer2hex(txIn.hash),
              index: txIn.index,
            },
            signatureScript: buffer2hex(txIn.script),
            sequence: txIn.sequence,
          };
        });

        const txOuts = tx.outs.map((txOut: Out) => {
          return {
            value: txOut.value,
            pkScript: buffer2hex(txOut.script),
          };
        });

        const transaction = {
          version: tx.version,
          txIn: txIns,
          txOut: txOuts,
          lockTime: tx.locktime,
        };

        const txHex = bitcoin.TxCodec.encode(transaction);

        const sha256Result = reverseHex(sha256v2(sha256v2(txHex)));

        const transactionId = buffer2hex(sha256Result);

        txIds.push(transactionId);
      });

      return txIds;
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
