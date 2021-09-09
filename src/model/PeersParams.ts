import PeerParams from "./PeerParams";

type PeersParams = PeerParams & {
  dnsSeeds?: Array<string>;
  getNewPeer?: any;
};

export default PeersParams;
