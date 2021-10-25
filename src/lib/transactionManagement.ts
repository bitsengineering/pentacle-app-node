import { access, readFileSync, writeFileSync } from "fs";
import { Transaction } from "../model";
import { In, Out } from "../model/Transaction";
import { Peer } from "./Peer";
import * as bitcoin from "@bitmatrix/bitcodec-bitcoin";
import { buffer2hex, reverseHex, sha256v2 } from "./utils";
import { merkleRootVerify } from "./feat";

export class TransactionManagement {
  peer: Peer;

  constructor(newPeer: Peer) {
    this.peer = newPeer;
  }

  private readTransactions = () => {
    const data = readFileSync("transactions.json", "utf8");
    return JSON.parse(data);
  };

  private writeTransaction = (transaction: Transaction) => {
    const currentTransactions = this.readTransactions();

    let newTransactions = [...currentTransactions];

    newTransactions.push(transaction);
    const json = JSON.stringify(newTransactions);
    return writeFileSync("transaction.json", json, "utf8");
  };

  private getTransactionsByBlock = async (blockHash: string) => {
    try {
      const blocks = await this.peer.getBlocks([blockHash]);
      let txIds: any = [];
      let blockTxs: any = [];

      const blockMerkleRoot = reverseHex(
        buffer2hex(blocks[0].header.merkleRoot).toLocaleUpperCase()
      );

      blocks[0].transactions.forEach((tx: Transaction) => {
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

        blockTxs.push(tx);

        const txHex = bitcoin.TxCodec.encode(transaction);

        const sha256Result = reverseHex(sha256v2(sha256v2(buffer2hex(txHex))));

        const transactionId = buffer2hex(sha256Result);

        txIds.push(transactionId);
      });

      return { blockTxs, txIds, blockMerkleRoot };
    } catch (error) {
      console.log("getTransactionsByBlock catch");
      console.log(error);
    }
  };

  private storeHeaders = async (txs: Transaction[]) => {
    access("transactions.json", async (notExist) => {
      if (notExist) {
        let newTransactions: Transaction[] = [];
        txs.forEach(async (tx: Transaction) => {
          newTransactions.push(tx);
          const json = JSON.stringify(newTransactions);
          return writeFileSync("transaction.json", json, "utf8");
        });
      } else {
        txs.forEach(async (tx: Transaction) => {
          this.writeTransaction(tx);
        });
      }
    });
  };

  getAndWriteTransactions = async (blockHash: string) => {
    const block = await this.getTransactionsByBlock(blockHash);

    if (block) {
      const isVerify = merkleRootVerify(block.txIds, block.blockMerkleRoot);

      if (isVerify) {
        this.storeHeaders(block.blockTxs);
      } else {
        throw "Merkle Root Verify Error";
      }
    }
  };
}
