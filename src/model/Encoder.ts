type Encoder = {
  magic: Number; // optional if you set this in the options
  command: String;
  payload: Object; // see below for detailed payload formats
};

export default Encoder;
