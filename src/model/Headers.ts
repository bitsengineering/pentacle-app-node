type Headers = {
  version: Number;
  locator: Array<Buffer>; // 32 bytes
  hashStop: Buffer; // 32 bytes
};

export default Headers;
