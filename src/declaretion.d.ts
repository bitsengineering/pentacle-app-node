// import debug from "debug";
declare module "bitcoin-protocol";
declare module "bitcoin-util";
declare module "event-cleanup";

declare namespace NodeJS {
  interface Process {
    browser: boolean;
  }
}

// declare namespace debug {
//   interface Debug extends debug.Debug {
//     debug: debug.Debug;
//     default: debug.Debug;
//     rx: any;
//     tx: any;
//   }
// }
