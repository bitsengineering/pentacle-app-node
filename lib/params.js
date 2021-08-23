export const params = {
  // REQUIRED

  // the fixed value which is used as a prefix to each packet, used to ensure
  // peers are on the same network.
  // (in Bitcoin, this is 0xd9b4bef9)
  magic: Number,

  // the default port this network uses to listen for TCP connections
  // (in Bitcoin, this is 8333)
  defaultPort: Number,

  // OPTIONAL

  // the default port to listen on for WebSocket servers. If not provided,
  // default will be 8192
  defaultWebPort: Number,

  // an array of `bitcoin-net` nodes which are accepting incoming WebSocket
  // connections, used to bootstrap the WebSocket/WebRTC peer exchange. If no
  // web seeds are provided, browser clients will not be able to make any
  // connections
  webSeeds: [
    String, // the hostname of a seed, and optionally the port, in the following format:
            // 'hostname' or 'hostname:port'
    ...
  ],

  // an array of DNS seeds which will be used to discover TCP peers
  dnsSeeds: [
    String, // the hostname of a DNS seed, e.g. 'seed.bitcoin.sipa.be'
    ...
  ],

  // an array of known TCP peers that can be connected to when making outgoing connections
  staticPeers: [
    String, // the hostname of a peer, and optionally the port, in the following format:
            // 'hostname' or 'hostname:port'
    ...
  ]
}