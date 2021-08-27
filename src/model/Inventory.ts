import { type } from "os";

type Inv = {
  type: Number;
  hash: Buffer; // 32 bytes
};

type Inventory = Array<Inv>;

export default Inventory;
