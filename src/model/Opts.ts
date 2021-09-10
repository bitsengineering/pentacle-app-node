import { Socket } from "net";

type Opts = {
  userAgent?: string;
  relay?: boolean;
  socket?: Socket;
  handshakeTimeout?: number;
  pingInterval?: any;
  requireBloom?: boolean;
  timeout?: number;
  filtered?: boolean;
  stop?: Buffer;
  startHeigh?: number;
};

export default Opts;
