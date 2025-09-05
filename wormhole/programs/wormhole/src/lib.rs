use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    system_instruction,
};
use corm_core::cpi::post_message;
use corm_core::cpi::accounts::PostMessage;
use corm_core::Payload;

declare_id!("D5GvTSTXzpax5KZugdaNH67JoJRsPf1ntMHRjCTMY7jX");


#[event]
pub struct LockEvent {
    pub core_program: Pubkey,
   
}

#[program]
pub mod wormhole {
    use super::*;

     pub fn initialize(ctx: Context<Initialize>, owner: Pubkey, core_program: Pubkey) -> Result<()> {
        require_keys_eq!(ctx.accounts.core_program.key(), core_program);
        ctx.accounts.config.owner = owner;
        ctx.accounts.config.core_program = core_program;
        ctx.accounts.config.is_paused = false;
        ctx.accounts.config.token_bump = ctx.bumps.config;    // bump for token-config PDA
        ctx.accounts.config.emitter_bump = ctx.bumps.emitter; // bump for emitter PDA
        Ok(())
    }

    pub fn update(ctx: Context<Update>, is_paused: bool, core_program: Pubkey) -> Result<()> {
        require_keys_eq!(ctx.accounts.core_program.key(), core_program);
        ctx.accounts.config.is_paused = is_paused;
        ctx.accounts.config.core_program = core_program;
        Ok(())
    }

    /// token_lock
    pub fn token_lock(
        ctx: Context<TokenLock>,
        receiver: [u8; 20],
        amount: u64,
        nonce: u64,
        consistency: u8,              // pass consistency too
    ) -> Result<()> {
        // 1) basic checks 
        require!(!ctx.accounts.config.is_paused, CustomError::Paused);
        require_keys_eq!(ctx.accounts.core_program.key(), ctx.accounts.config.core_program);

        // Use payer (signer) as the true sender
        let sender_key = ctx.accounts.payer.key();

        // 2) transfer SOL to vault (payer must be signer
        let ix_transfer = system_instruction::transfer(&sender_key, &ctx.accounts.sol_vault.key(), amount);
        anchor_lang::solana_program::program::invoke(
            &ix_transfer,
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.sol_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // 3) build payload  
        let payload_struct = Payload {
            action: 0u8,
            sender: sender_key,
            receiver,
            amount,
            nonce,
        };
        let payload_bytes = payload_struct.try_to_vec()?;
        require!(payload_bytes.len() <= MAX_PAYLOAD_LEN, CustomError::PayloadTooLarge);
        
        emit!(LockEvent {
            core_program: ctx.accounts.config.core_program,
        });
        

        // CPI to core's post_message
        let cpi_accounts = PostMessage {
            config: ctx.accounts.core_config.to_account_info(),
            emitter: ctx.accounts.emitter.to_account_info(),
            emitter_seq: ctx.accounts.emitter_seq.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let emitter_seed_slice: &[&[u8]] = &[b"token-lock-emitter".as_ref(), std::slice::from_ref(&ctx.accounts.config.emitter_bump)];
        let signer_seeds: &[&[&[u8]]] = &[emitter_seed_slice];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.core_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        post_message(cpi_ctx, payload_struct, nonce, consistency)?;
        

        Ok(())
    }
}


const MAX_PAYLOAD_LEN: usize = 1024; 

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"token-config"],
        bump,
        space = 8 + Config::SIZE
    )]
    pub config: Account<'info, Config>,

    // create emitter PDA (marker account with only discriminator)
    #[account(init, payer = payer, seeds = [b"token-lock-emitter"], bump, space = 8)]
    pub emitter: Account<'info, Empty>,

   

     /// CHECK: Core program config account, owner is verified in core
    #[account(mut)]
    pub core_config: UncheckedAccount<'info>,

    /// CHECK: The core program
    pub core_program: UncheckedAccount<'info>,

    #[account(init, payer = payer, seeds = [b"sol-vault"], bump, space = 8)]
    pub sol_vault: Account<'info, Vault>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, seeds = [b"token-config"], bump = config.token_bump, has_one = owner)]
    pub config: Account<'info, Config>,
    pub owner: Signer<'info>,
    /// CHECK: The core program
    pub core_program: UncheckedAccount<'info>,
}

/// For token_lock instruction we expect the emitter_seq PDA exists and is **owned by core**.
/// token_lock only passes it in; core will modify it.
#[derive(Accounts)]
pub struct TokenLock<'info> {
    #[account(mut, seeds = [b"sol-vault"], bump)]
    pub sol_vault: Account<'info, Vault>,

    #[account(mut, seeds = [b"token-config"], bump = config.token_bump)]
    pub config: Account<'info, Config>,

    /// Emitter PDA (marker)
    #[account(mut, seeds = [b"token-lock-emitter"], bump = config.emitter_bump)]
    pub emitter: Account<'info, Empty>,

    /// CHECK: This account is owned by the core program and token_lock only passes it in for the CPI.
    /// No checks are needed here because core will handle validation and modification.
    #[account(mut)]
    pub emitter_seq: UncheckedAccount<'info>,

    /// CHECK: Core program config account, owner is verified in core.
    #[account(mut)]
    pub core_config: UncheckedAccount<'info>,

    /// CHECK: The core program
    pub core_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}


/* simple Vault account to hold lamports */

#[account]
pub struct Vault {}

#[account]
pub struct Config {
    pub owner: Pubkey,
    pub core_program: Pubkey,
    pub token_bump: u8,
    pub emitter_bump: u8,
    pub is_paused: bool,
}
impl Config {
    pub const SIZE: usize = 32 + 32 + 1 + 1 + 1;
}

#[account]
pub struct Empty {}

#[error_code]
pub enum CustomError {
    #[msg("you are not authorized to perform this action")]
    Unauthorized,
    #[msg("contract is paused by owner")]
    Paused,
    #[msg("payload too large")]
    PayloadTooLarge,
}

