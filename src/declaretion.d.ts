// import debug from "debug";

declare namespace NodeJS {
  interface Process {
    browser: boolean;
  }
}

declare namespace debug {
  interface Debug extends debug.Debug {
    debug: debug.Debug;
    default: debug.Debug;
    rx: any;
    tx: any;
  }
}
