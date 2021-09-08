interface VersionParams {
  version: Number;
  services: Buffer; // 8 bytes
  timestamp: Number;
  receiverAddress: {
    services: Buffer; // 8 bytes
    address: String; // ipv4 or ipv6
    port: Number;
  };
  senderAddress: {
    services: Buffer; // 8 bytes
    address: String; // ipv4 or ipv6
    port: Number;
  };
  nonce: Buffer; // 8 bytes
  userAgent?: String;
  startHeight: Number;
  relay: Boolean;
}

export default VersionParams;
