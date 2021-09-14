import { Peer } from "./lib";
import { Socket, connect as connectNet } from "net";
import { Header } from "./model";
import { dnsSeeds } from "./lib/constants";

const peer = new Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, {});

const getPeerHeaders = () => {
  console.log("getPeerHeaders");
  peer
    .getHeaders([Buffer.from("0000000000000000002b0fcdc0bdedcc71fcce092633885628c3b50d43200002", "hex").reverse()])
    .then((headerses: Array<Array<Header>>) => {
      console.log("getPeerHeaders then");
      console.log(headerses.length);
      console.log(headerses[0].length);
      console.log("headers", headerses[0][0].header.version);
    })
    .catch((error) => {
      console.log("getPeerHeaders catch");
      console.log(error);
    });
};

const connectionListener = (socket: Socket) => {
  peer.connect(socket);

  peer.readyOnce().then(() => {
    //GET HEADERS
    getPeerHeaders();
  });
};

const testIt = () => {
  const socket: Socket = connectNet({ port: 8333, host: dnsSeeds[1] }, () => {
    connectionListener(socket);
  });
};

testIt();
