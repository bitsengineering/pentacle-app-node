import VersionParams from "./VersionParams";
import Inventory from "./Inventory";
import GetHeadersParam from "./GetHeadersParam";
import PingPong from "./PingPong";
import Decoder from "./Decoder";
import Encoder from "./Encoder";

type PayloadReference = VersionParams | Inventory | GetHeadersParam | PingPong | Decoder | Encoder;

export default PayloadReference;
