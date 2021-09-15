import PeerParams from "./PeerParams";

type PeersParams = PeerParams & {
  dnsSeeds?: string[];
  getNewPeer?: any;
};

export default PeersParams;
