import PeerParams from "./PeerParams";

type PeersParams = PeerParams & {
  webSeeds?: Array<string>;
  dnsSeeds?: Array<string>;
  staticPeers?: Array<string>;
  getNewPeer?: any;
};

export default PeersParams;
