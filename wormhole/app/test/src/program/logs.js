import {  Connection,PublicKey } from "@solana/web3.js";

// 1) Connection banao
const connection = new Connection("http://localhost:8899", "confirmed");

// 2) Program ID jisne event emit kiya
// const PROGRAM_ID = new PublicKey("EpZpzeNFLT1zycUFDQNNdbBMxMYXjrQY6znRRr4ZKpcU");

// export const logs=async()=> {
//   // 3) Get transaction signatures
//   const signatures = await connection.getSignaturesForAddress(PROGRAM_ID, { limit: 5 });
//   console.log("Found signatures:", signatures.map(sig => sig.signature));

//   for (const sigInfo of signatures) {
//     const sig = sigInfo.signature;

//     // 4) Fetch full transaction
//     const tx = await connection.getTransaction(sig, {
//       maxSupportedTransactionVersion: 0
//     });

//     if (!tx?.meta?.logMessages) continue;

//     console.log(`\nLogs for tx: ${sig}`);
//     for (const log of tx.meta.logMessages) {
//       console.log(log);

//       // 5) Agar event anchor ka hai to "Program data:" base64 string decode karna padega
//       if (log.startsWith("Program data:")) {
//         const base64data = log.replace("Program data: ", "");
//         const buf = Buffer.from(base64data, "base64");
//         console.log("Decoded raw event data:", buf);
//         // Yahan pe tum anchor IDL ka use karke proper struct decode kar sakte ho
//       }
//     }
//   }
// }





// import { Connection, PublicKey } from "@solana/web3.js";
import { EventParser, BorshCoder } from "@coral-xyz/anchor";
import idl from '../../../../target/idl/corm_core.json'

// const connection = new Connection("http://localhost:8899");
const PROGRAM_ID_2 = new PublicKey("EpZpzeNFLT1zycUFDQNNdbBMxMYXjrQY6znRRr4ZKpcU");

export async function parseEvents() {
    // console.log("step-1");
  const coder = new BorshCoder(idl);
  const parser = new EventParser(PROGRAM_ID_2, coder);

  const sigs = await connection.getSignaturesForAddress(PROGRAM_ID_2, { limit: 10 });
  console.log("Found signatures:", sigs);
  for (const sig of sigs) {
    const tx = await connection.getTransaction(sig.signature, { commitment: "confirmed" });
    if (!tx?.meta?.logMessages) continue;
    // console.log(`\nParsing logs for tx: ${sig.signature}`);
    parser.parseLogs(tx.meta.logMessages).forEach((event) => {
      console.log("Event name:", event.name);
      console.log("Event data:", event.data);
    });
  }

}

// parseEvents();

