import { Socket } from "net";

type Opts = {
  userAgent?: string;
  subUserAgent?: string;
  getTip?: any;
  relay?: boolean;
  socket?: Socket;
  handshakeTimeout?: number;
  pingInterval?: any;
  requireBloom?: boolean;
  timeout?: number;
  filtered?: boolean;
  stop?: Buffer;
};

export default Opts;
