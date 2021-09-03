type PeerParams = {
  protocolVersion?: number;
  minimumVersion?: number;
  magic?: number;
  messages?: string;
  defaultPort?: number;
};

export default PeerParams;
