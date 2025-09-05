use anchor_lang::prelude::*;

declare_id!("EpZpzeNFLT1zycUFDQNNdbBMxMYXjrQY6znRRr4ZKpcU");

#[program]
pub mod corm_core {
    use super::*;

   pub fn initialize(ctx: Context<Initialize>, owner: Pubkey, chain_id: u16) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.owner = owner;
        cfg.is_paused = false;
        cfg.bump = ctx.bumps.config;
        cfg.chain_id = chain_id;
        Ok(())
    }

    /// Owner can update pause state (only owner).
    pub fn update_config(ctx: Context<UpdateConfig>, is_paused: bool) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.is_paused = is_paused;
        Ok(())
    }

    /// Register an emitter: creates an `EmitterSeq` PDA (owned by core) for the given emitter pubkey.
    /// Called once per emitter (e.g. by token_lock::initialize via CPI).
    pub fn register_emitter(ctx: Context<RegisterEmitter>) -> Result<()> {
        let seq = &mut ctx.accounts.emitter_seq;
        seq.emitter = ctx.accounts.emitter.key();
        seq.seq = 0;
        seq.bump = ctx.bumps.emitter_seq;
        Ok(())
    }
     pub fn post_message(
        ctx: Context<PostMessage>,
        payload: Payload,
        nonce: u64,
        consistency: u8,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.is_paused, CoreError::Paused);

        // Validate emitter identity matches the seq account record
        let emitter_seq = &mut ctx.accounts.emitter_seq;
        require_keys_eq!(emitter_seq.emitter, ctx.accounts.emitter.key(), CoreError::EmitterMismatch);

        // increment sequence (core owns emitter_seq so it's allowed)
        emitter_seq.seq = emitter_seq.seq.checked_add(1).ok_or(CoreError::Overflow)?;

        // emit event that off-chain relayers / guardians will pick up
        emit!(MessagePosted {
            chain_id: cfg.chain_id,
            sequence: emitter_seq.seq,
            nonce,
            consistency,
            emitter: ctx.accounts.emitter.key(),
            timestamp: Clock::get()?.unix_timestamp,
            payload,
        });

        Ok(())
    }
}

// #[derive(Accounts)]
// pub struct Initialize {}


#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"core-config"],
        bump,
        space = 8 + Config::SIZE
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, seeds = [b"core-config"], bump = config.bump, has_one = owner)]
    pub config: Account<'info, Config>,

    pub owner: Signer<'info>,
}

/// Create EmitterSeq PDA owned by core (init here).
#[derive(Accounts)]
pub struct RegisterEmitter<'info> {
    #[account(mut, seeds = [b"core-config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The emitter identity (PDA or user) that will post messages. Must be provided.
    /// CHECK: This is an unchecked account. Its safety is ensured by external constraints and no additional type checks are required.
    pub emitter: AccountInfo<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [b"seq", emitter.key().as_ref()],
        bump,
        space = 8 + EmitterSeq::SIZE
    )]
    pub emitter_seq: Account<'info, EmitterSeq>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PostMessage<'info> {
    #[account(mut, seeds = [b"core-config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// The emitter (the identity posting). Must sign — if emitter is a PDA, caller must pass it as signer via invoke_signed.
    pub emitter: Signer<'info>,

    /// The emitter sequence account (owned by core) for this emitter.
    /// Must be the PDA derived with seeds [b"seq", emitter.key().as_ref()].
    #[account(mut, seeds = [b"seq", emitter.key().as_ref()], bump = emitter_seq.bump)]
    pub emitter_seq: Account<'info, EmitterSeq>,

    /// System program (if required for internal ops)
    pub system_program: Program<'info, System>,
}

/// State structs

#[account]
pub struct Config {
    pub owner: Pubkey,
    pub is_paused: bool,
    pub bump: u8,
    pub chain_id: u16,
}
impl Config {
    pub const SIZE: usize = 32 + 1 + 1 + 2;
}

#[account]
pub struct EmitterSeq {
    pub emitter: Pubkey,
    pub seq: u64,
    pub bump: u8,
}
impl EmitterSeq {
    pub const SIZE: usize = 32 + 8 + 1;
}

/// Application-level payload (opaque to core besides being stored/emitted).
#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Payload {
    pub action: u8,          // 0 = lock, 1 = release, etc.
    pub sender: Pubkey,      // solana sender
    pub receiver: [u8; 20],  // ethereum address
    pub amount: u64,
    pub nonce: u64,
}

/// Events

#[event]
pub struct MessagePosted {
    pub chain_id: u16,
    pub sequence: u64,
    pub nonce: u64,
    pub consistency: u8,
    pub emitter: Pubkey,
    pub timestamp: i64,
    pub payload: Payload,
}

/// Errors

#[error_code]
pub enum CoreError {
    #[msg("Core is paused, cannot post messages")]
    Paused,
    #[msg("EmitterSeq emitter mismatch")]
    EmitterMismatch,
    #[msg("Arithmetic overflow")]
    Overflow,
}
