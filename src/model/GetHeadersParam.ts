type GetHeadersParam = {
  version: Number;
  locator: Buffer[]; // 32 bytes
  hashCount?: string;
  hashStop?: Buffer; // 32 bytes
};

export default GetHeadersParam;
