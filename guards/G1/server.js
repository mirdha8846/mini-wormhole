import express from 'express';
import dotenv from 'dotenv';
import cormCore from '../corm_core.json' with { type: "json" };
import { EventParser, BorshCoder } from "@coral-xyz/anchor";
import { parseEvents } from './parseEvents.js';
import { verifySignature } from './config.js';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { createVAA } from './createVAA.js';
dotenv.config();

global.myState = {
  signatures: {},
  lastProcessed: {}
}

const THRESHOLD=2
const app = express();
const port = 4001;
app.use(express.json());
const programId = new PublicKey(process.env.PROGRAM_ID);
const coder = new BorshCoder(cormCore);
const parser = new EventParser(programId, coder);


setInterval(() => console.log("Current state: ",JSON.stringify(global.myState, null, 2)), 4000);





app.post('/gossip', (req, res) => {
    console.log("G3: Received gossip")
  const { digest, sig, id, pub } = req.body
  console.log("get gossip in G3 from ",id)
  if (!verifySignature(digest, sig, pub)) return res.status(400).send('bad sig')
  if (!global.myState.signatures[digest]) global.myState.signatures[digest] = { digest, sigs: [] }
  if (!global.myState.signatures[digest].sigs.find(s => s.id === id)) {

  

  global.myState.signatures[digest].sigs.push({
    id,
    sig,
    pub,
    gossiped: true, // remote sigs are already gossiped
  })

  
}

  res.json({ ok: true })
})


app.get('/vaa/:digest', (req, res) => {
  console.log("G3: VAA request received")
  const digest = req.params.digest
  const entry = global.myState.signatures[digest]
  if (entry && entry.sigs.length >= THRESHOLD) {
    const vaa = createVAA(entry)
    res.json({ VAA: vaa })
  } else {
    res.status(404).send('VAA not ready')
  }
})


app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

setInterval(() => parseEvents(parser), 3000);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
