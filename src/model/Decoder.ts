type Decoder = {
  magic: Number;
  command: String;
  length: Number;
  checksum: Buffer; // 8 bytes,
  payload: Object; // see below for detailed payload formats
};

export default Decoder;
