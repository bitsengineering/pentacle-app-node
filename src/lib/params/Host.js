import net from 'net';

export class Host{
  IPV6_IPV4_PADDING:Buffer = Buffer.from([0,0,0,0,0,0,0,0,0,0,255,255]);
  defaultPort:number = 8333;

  readonly host: string|Buffer;
  readonly port: number;
  readonly version: number;

  constructor(host:number|string|any[] = 'localhost', port?:number) {
 
  this.host = 'localhost';
  this.port = port || this.defaultPort;;
  this.version = 4;

  if (host === 'localhost') {
    this.host = host;
    return this;
  }
  //

  if (Array.isArray(host)) {
    this.host = Buffer.from(host);
  }
  
  //
  else if (typeof host === 'number') {
    // an IPv4 address, expressed as a little-endian 4-byte (32-bit) number
    // style of "pnSeed" array in Bitcoin reference client
    const buffer = Buffer.alloc(4);
    buffer.writeInt32LE(host, 0);
    this.host = Array.prototype.join.apply(buffer, ['.']);
    return this;
  } 
  
  
  else if (typeof host === 'string') {
    this.host = host;
    
    let ver = net.isIP(host);
    
    if (ver == 0) {
      // DNS host name string
      if (host.indexOf(':') !== -1) {
        const pieces = host.split(':');
        this.host = pieces[0];
        this.port = Number(pieces[1]) || this.defaultPort; // Given "example.com:8080" as host, and "1234" as port, the "8080" takes priority
        ver = net.isIP(host);
        if (ver == 0) {
          // TODO: Resolve to IP, to ensure unique-ness
          
        }
      }
    }
    return this;
  } 
  
  else if (Buffer.isBuffer(host)) {
    if (host.length == 4) {
      // IPv4 stored as bytes
      _host = Array.prototype.join.apply(host, ['.']);
      _version = 4;
      return this;
    } else if (host.slice(0, 12).toString('hex') != Host.IPV6_IPV4_PADDING.toString('hex')) {
      // IPv6
      _host = host.toString('hex').match(/(.{1,4})/g).join(':').replace(/\:(0{2,4})/g, ':0').replace(/^(0{2,4})/g, ':0');
      _version = 6;
      return this;
    } else {
      // IPv4 with padding in front
      _host = Array.prototype.join.apply(host.slice(12), ['.']);
      _version = 4;
      return this;
    }
  } 
  
  else {
    throw new Error('Cound not instantiate peer; invalid parameter type: '+ typeof host);
  }

};
Host.prototype.IPV6_IPV4_PADDING = new Buffer([0,0,0,0,0,0,0,0,0,0,255,255]);
Host.prototype.defaultPort = 8333;