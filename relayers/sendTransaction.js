import {Connection, PublicKey} from "@solana/web3.js";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();
import { getVAA } from "./getVAA.js";

const connection = new Connection(process.env.RPC_URL)
const programId = new PublicKey(process.env.PROGRAM_ID)
export async function sendToETH(parser) {
  console.log("Parsing events...")

  try {
    const sigs = await connection.getSignaturesForAddress(programId, { limit: 10 })
    console.log("Found signatures:", sigs.length)

    for (const sig of sigs) {
      const tx = await connection.getTransaction(sig.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      })
      if (!tx?.meta?.logMessages) continue

      for (const event of parser.parseLogs(tx.meta.logMessages)) {
        if (event.name !== "MessagePosted") continue

        const emitter = event.data.emitter.toBase58()
        const seq = event.data.sequence.toNumber()

        // Skip old
        if (global.myState.lastProcessed[emitter] && seq <= global.myState.lastProcessed[emitter]) {
          console.log(`⏭ Skipping old event seq=${seq} from ${emitter}`)
          continue
        }

        // Digest
        const digest = crypto.createHash("sha256")
          .update(JSON.stringify(event.data))
          .digest("hex")

          const result = await getVAA(digest)
          if (!result) {
            console.log("VAA not ready yet, will try again later")
            continue
          }else{
            //here we send to smart contract
            console.log("✅ Got VAA: ",result)
            global.myState.lastProcessed[emitter] = seq
            console.log(`✅ Processed event seq=${seq} from ${emitter}`)
          }
        

    }  }} catch (e) {
    console.error("Error in parseEvents:", e)
  }
}