import Version from "./Version";
import Inventory from "./Inventory";
import Headers from "./Headers";
import PingPong from "./PingPong";
import Decoder from "./Decoder";
import Encoder from "./Encoder";

type PayloadReference =
  | Version
  | Inventory
  | Headers
  | PingPong
  | Decoder
  | Encoder;

export default PayloadReference;
