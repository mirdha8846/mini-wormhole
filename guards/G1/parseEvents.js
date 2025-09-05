// 

import { Connection, PublicKey } from "@solana/web3.js"
import dotenv from "dotenv"
import crypto from "crypto"
import { gossipSignature, signDigest, NODE_ID, PUBLIC_KEY as PUB_FROM_CONFIG } from "./config.js"

dotenv.config()
const PEERS=[
  "http://localhost:4002",
  "http://localhost:4003"
]

const connection = new Connection(process.env.RPC_URL)
const programId = new PublicKey(process.env.PROGRAM_ID)
const PUBLIC_KEY = PUB_FROM_CONFIG ?? new PublicKey(process.env.PUBLIC_KEY)
export async function parseEvents(parser) {
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

        console.log("G3: Signing digest", digest)
        const sigNode = signDigest(digest)

        // Ensure slot exists
        if (!global.myState.signatures[digest]) {
          global.myState.signatures[digest] = { digest, sigs: [] }
        }

        // Ensure entry for this node
        let entry = global.myState.signatures[digest].sigs.find(s => s.id === NODE_ID)
        if (!global.myState.signatures[digest].sigs.find(s => s.id === NODE_ID)) {
  global.myState.signatures[digest].sigs.push({
    id: NODE_ID,
    sig: sigNode,
    pub: PUBLIC_KEY.toBase58(),
    gossiped: false,
  })
  console.log("💾 Locally stored my own sig:", JSON.stringify(global.myState.signatures[digest], null, 2))
}


        // Gossip only if not already gossiped
        if (!entry.gossiped) {
          const success = await gossipSignature(digest, sigNode, PEERS)
          if (success) {
            entry.gossiped = true
            global.myState.lastProcessed[emitter] = seq
            console.log(`✅ Stored & processed event seq=${seq} from ${emitter}`)
          } else {
            console.log(`⏳ Gossip failed for seq=${seq}, will retry later`)
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ Error in parsing events:", err)
  }
}
