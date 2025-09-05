import { useState } from 'react'
import { BN } from 'bn.js'
import './App.css'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { fun } from './program/program'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { ethers } from "ethers";
import { fun2 ,} from './program/program2'
import { parseEvents } from './program/logs'
// import { logs } from './program/logs'
window.Buffer = Buffer

function App() {
  const [count, setCount] = useState(0)
  const { wallet, } = useWallet()
  const { connection } = useConnection()
  const pro=  fun(wallet)
  const pro2= fun2(wallet)
  
  // console.log("proo",pro)
  // owener pubkey: DJvqXv9jeBJoH1n7aCSK16GxMfBmwToQEybPaUYhdVJG
  const ownerKey=[228,169,87,203,170,95,244,212,53,212,16,27,196,54,67,156,237,252,71,105,20,7,87,133,242,71,90,207,138,4,243,33,182,227,253,132,208,148,6,248,150,49,20,130,234,111,147,140,233,253,245,234,161,212,11,50,89,237,97,150,251,96,207,153]
  const ownerKeyPair=Keypair.fromSecretKey(Uint8Array.from(ownerKey))

  //pubkey: 5w71ioXHhVDu9FzD7yTZ9J3cdbZ3NQPf2JYj36Ty6dk7
  const anotherkey=[115,228,80,23,2,28,154,253,131,136,41,182,51,92,227,93,178,160,134,145,160,179,89,24,186,200,75,186,231,30,79,191,73,74,232,223,249,52,113,68,75,57,3,204,26,250,43,194,49,111,243,37,76,68,7,254,251,216,12,50,10,130,195,156]
  const anotherKeyPair=Keypair.fromSecretKey(Uint8Array.from(anotherkey))

//b"seq", emitter.key().as_ref()],
const programId = new PublicKey(pro._idl.address)
const coreID= new PublicKey(pro2._idl.address)

let [configPda]  = PublicKey.findProgramAddressSync([Buffer.from("token-config")], programId)
let [emitterPda] = PublicKey.findProgramAddressSync([Buffer.from("token-lock-emitter")], programId)
let [solVault]   = PublicKey.findProgramAddressSync([Buffer.from("sol-vault")], programId)
let [coreConfig] = PublicKey.findProgramAddressSync([Buffer.from("core-config")], coreID)
let [emitterSeq] = PublicKey.findProgramAddressSync([Buffer.from("seq"),emitterPda.toBuffer()], coreID)


const inithandle=async()=>{

    const inx = await pro.methods.initialize(
    ownerKeyPair.publicKey,
    coreID
  ).accounts({
    config: configPda,
    emitter: emitterPda,
    coreConfig: coreConfig,
    coreProgram: coreID,
    solVault: solVault,
    payer: ownerKeyPair.publicKey,
    systemProgram: SystemProgram.programId,
  }).instruction()
  
  const tx= new Transaction().add(inx)
  //get recentblockhash for this txn
  let { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer=ownerKeyPair.publicKey
  const sig=await connection.sendTransaction(tx, [ownerKeyPair])
   console.log("sig", sig)
  }

  const tokenLock=async()=>{
    const nonce=new BN(Date.now())
    const ethAddress = "0x2b8bBaae5E1D399Ef0609995Ff45c288F43b8CF6";

// Convert to Uint8Array (20 bytes)
const receiverBytes = ethers.getBytes(ethAddress);

       const inx2=await pro.methods.tokenLock(receiverBytes,new BN(100),nonce,new BN(2))
       .accounts({
        solVault: solVault,
        config: configPda,
        emitter: emitterPda,
        emitterSeq: emitterSeq,
        coreConfig: coreConfig,
        coreProgram: coreID,
        payer: ownerKeyPair.publicKey,
        systemProgram: SystemProgram.programId,
       })
       .instruction()

       const tx2= new Transaction().add(inx2)
       let {blockhash}= await connection.getLatestBlockhash()
       tx2.recentBlockhash = blockhash
       tx2.feePayer=ownerKeyPair.publicKey
       const sig2=await connection.sendTransaction(tx2, [ownerKeyPair])
       console.log("sig2", sig2)
  }


  const coreInit=async ()=>{
    const core_inx = await pro2.methods.initialize(
      ownerKeyPair.publicKey,
      new BN(1)
    ).accounts({
      config: coreConfig,
      payer: ownerKeyPair.publicKey,
      systemProgram: SystemProgram.programId,
    }).instruction()

    const core_tx= new Transaction().add(core_inx)
    //get recentblockhash for this txn
    let { blockhash } = await connection.getLatestBlockhash()
    core_tx.recentBlockhash = blockhash
    core_tx.feePayer=ownerKeyPair.publicKey
    const sig3=await connection.sendTransaction(core_tx, [ownerKeyPair])
    console.log("sig3", sig3)


  }

  const register=async()=>{
          const core_inx2= await pro2.methods.registerEmitter(

          )
          .accounts({
            config: coreConfig,
            emitter:emitterPda,
            emitterSeq:emitterSeq,
            payer:ownerKeyPair.publicKey,
            systemProgram:SystemProgram.programId

          }).instruction()
          const core_tx2= new Transaction().add(core_inx2)

            let { blockhash } = await connection.getLatestBlockhash()
    core_tx2.recentBlockhash = blockhash
    core_tx2.feePayer=ownerKeyPair.publicKey
    const sig4=await connection.sendTransaction(core_tx2, [ownerKeyPair])
    console.log("sig4", sig4)

  }

  


  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '200px', padding: '20px', borderRight: '1px solid #ccc' }}>
        <WalletMultiButton />
      </div>
      <div style={{ flex: 1, padding: '20px' }}>
        <h1>Token Lock DApp</h1>
        <p>Count is {count}</p>
        <button onClick={() => inithandle()}>
          test
        </button>
        <button style={{ marginLeft: '10px' }} onClick={() => tokenLock()}>
          Lock Tokens
        </button>
        <button style={{ marginLeft: '10px' }} onClick={() => coreInit()}>
          Initialize Core
        </button>
        <button style={{ marginLeft: '10px' }} onClick={() => register()}>
          register
        </button>
      </div>
    </div>
  )
}

export default App
