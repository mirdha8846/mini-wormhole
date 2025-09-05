import axios from 'axios'
import dotenv from "dotenv"
import crypto from 'crypto'
import nacl from 'tweetnacl'
import { Keypair, PublicKey } from '@solana/web3.js';
dotenv.config();

 const PEERS=[
  "http://localhost:4001",
  "http://localhost:4003"
]
export const NODE_ID = process.env.NODE_ID
export const PUBLIC_KEY = new PublicKey(process.env.PUBLIC_KEY)

// Load Solana ed25519 keypair from env PRIVATE_KEY (JSON array of 64 bytes)
let KEYPAIR
try {
  const sk = JSON.parse(process.env.PRIVATE_KEY || 'null')
  if (!Array.isArray(sk)) throw new Error('PRIVATE_KEY must be a JSON array')
  KEYPAIR = Keypair.fromSecretKey(Buffer.from(sk))
} catch (e) {
  console.error('Failed to load PRIVATE_KEY from env:', e.message)
}


export async function gossipSignature(digest, sig, peers) {
  console.log("peers:", peers)

  try {
    const results = await Promise.allSettled(
      peers.map((p) =>
      
        axios.post(`${p}/gossip`, {
          digest,
          sig,
          id: NODE_ID,
          pub: PUBLIC_KEY.toBase58(),
        })
      )
    )

    // Check if all peers responded with ok:true
    const allOk = results.every(
      (r) => r.status === "fulfilled" && r.value?.data?.ok
    )

    if (!allOk) {
      console.log("⚠️ Gossip failed for some peers, retry needed")
      return false
    }

    console.log("✅ Gossip succeeded to all peers")
    return true
  } catch (err) {
    console.error("❌ Gossip error:", err)
    return false
  }
}




export function signDigest(digest) {
  if (!KEYPAIR) throw new Error('Keypair not initialized (check PRIVATE_KEY env)')
  // digest is hex string; sign the raw bytes using ed25519 (tweetnacl)
  const msg = Buffer.from(digest, 'hex')
  const signature = nacl.sign.detached(msg, KEYPAIR.secretKey)
  return Buffer.from(signature).toString('base64')
}

export function verifySignature(digest, sig, pub) {
  try {
    const msg = Buffer.from(digest, 'hex')
    const signature = Buffer.from(sig, 'base64')
    // pub can be a base58 string or a PublicKey
    const pubKey = typeof pub === 'string' ? new PublicKey(pub) : pub
    return nacl.sign.detached.verify(msg, signature, pubKey.toBytes())
  } catch (e) { return false }
}

