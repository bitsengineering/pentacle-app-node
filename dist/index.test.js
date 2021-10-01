"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("./lib");
const net_1 = require("net");
const constants_1 = require("./lib/constants");
let peer;
let connectionListener;
let socket;
beforeAll(() => {
    peer = new lib_1.Peer({ magic: 0xd9b4bef9, defaultPort: 8333 }, {});
    connectionListener = async (socket) => {
        try {
            peer.connect(socket);
            const a = await peer.readyOnce();
            console.log("peer connected", a);
        }
        catch (err) {
            console.log("uerror", err);
        }
    };
    // done();
});
test("peer test", (done) => {
    jest.useFakeTimers();
    socket = (0, net_1.connect)({ port: 8333, host: constants_1.dnsSeeds[0] }, async () => {
        await connectionListener(socket);
        done();
    });
});
afterAll(() => {
    peer.disconnect();
});
//# sourceMappingURL=index.test.js.map