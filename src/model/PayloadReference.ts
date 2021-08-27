import Version from "./Version";
import Inventory from "./Inventory";
import GetHeaders from "./GetHeaders";
import PingPong from "./PingPong";
import Decoder from "./Decoder";
import Encoder from "./Encoder";

type PayloadReference =
  | Version
  | Inventory
  | GetHeaders
  | PingPong
  | Decoder
  | Encoder;

export default PayloadReference;
