import idl from '../../../../target/idl/corm_core.json'
import * as anchor from '@coral-xyz/anchor'

const conn="http://localhost:8899"

export const fun2=(Wallet)=>{

    const provider=new anchor.AnchorProvider(conn, Wallet, {})
    anchor.setProvider(provider)
    // console.log("provider", provider)
    const program= new anchor.Program(
        idl ,
        provider

    )

    // console.log("program", program)

    return program
}