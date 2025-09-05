import express from 'express'
import { sendToETH } from './sendTransaction.js';
import { EventParser, BorshCoder } from "@coral-xyz/anchor";
import { PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import { getVAA } from './getVAA.js';
import idl from "./idl.json" with { type: "json" };
const app = express();
dotenv.config();
const PORT = 3000;



global.myState = {

  lastProcessed: {}
}


const programId = new PublicKey(process.env.PROGRAM_ID);
const coder = new BorshCoder(idl);
const parser = new EventParser(programId, coder);


setInterval(() => sendToETH(parser), 5000);
// setInterval(() => getVAA, 5000);








app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});