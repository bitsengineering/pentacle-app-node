import { Peer } from "./lib";
import { Socket, connect as connectNet } from "net";
import { dnsSeeds } from "./lib/constants";

let peer: Peer;
let connectionListener: (socket: Socket) => Promise<void>;
let socket: Socket;

beforeAll(() => {
  peer = new Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, {});
  connectionListener = async (socket: Socket) => {
    try {
      peer.connect(socket);
      const a = await peer.readyOnce();
      console.log("peer connected", a);
    } catch (err) {
      console.log("uerror", err);
    }
  };

  // done();
});

test("peer test", (done) => {
  jest.useFakeTimers();

  socket = connectNet({ port: 8333, host: dnsSeeds[0] }, async () => {
    await connectionListener(socket);
    done();
  });
});

afterAll(() => {
  peer.disconnect();
});
