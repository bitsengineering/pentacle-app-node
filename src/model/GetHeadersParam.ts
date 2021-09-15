type GetHeadersParam = {
  version: Number;
  locator: Buffer[]; // 32 bytes
  hashStop: Buffer; // 32 bytes
};

export default GetHeadersParam;
