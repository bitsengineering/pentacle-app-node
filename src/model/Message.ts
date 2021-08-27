import PayloadReference from "./PayloadReference";

interface Message {
  magic: number;
  command: string;
  length: number;
  checksum: Buffer;
  payload: PayloadReference;
}

export default Message;
