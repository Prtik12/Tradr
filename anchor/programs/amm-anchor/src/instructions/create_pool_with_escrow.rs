use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer}
};

use crate::{Config, EscrowState, EscrowStatus, error::AMMError, constants::DECIMALS};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct CreatePoolWithEscrow<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    pub mint_x: Account<'info, Mint>,
    pub mint_y: Account<'info, Mint>,

    /// Pool config account (will be created but not initialized yet)
    #[account(
        init,
        payer = creator,
        seeds = [b"config", seed.to_le_bytes().as_ref()],
        bump,
        space = Config::INIT_SPACE,
    )]
    pub config: Account<'info, Config>,

    /// Escrow state account
    #[account(
        init,
        payer = creator,
        seeds = [b"escrow", config.key().as_ref()],
        bump,
        space = EscrowState::INIT_SPACE,
    )]
    pub escrow: Account<'info, EscrowState>,

    /// Escrow vault for token X (holds liquidity until approval)
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint_x,
        associated_token::authority = escrow,
    )]
    pub escrow_vault_x: Account<'info, TokenAccount>,

    /// Escrow vault for token Y (holds liquidity until approval)
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint_y,
        associated_token::authority = escrow,
    )]
    pub escrow_vault_y: Account<'info, TokenAccount>,

    /// Creator's token X account (source of liquidity)
    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = creator,
    )]
    pub creator_token_x: Account<'info, TokenAccount>,

    /// Creator's token Y account (source of liquidity)
    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = creator,
    )]
    pub creator_token_y: Account<'info, TokenAccount>,

    /// LP mint (will be created but not used until approval)
    #[account(
        init,
        payer = creator,
        seeds = [b"lp", config.key().as_ref()],
        bump,
        mint::decimals = DECIMALS as u8,
        mint::authority = config
    )]
    pub mint_lp: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> CreatePoolWithEscrow<'info> {
    pub fn create_pool_with_escrow(
        &mut self,
        seed: u64,
        fee: u16,
        authority: Option<Pubkey>,
        amount_x: u64,
        amount_y: u64,
        bumps: &CreatePoolWithEscrowBumps,
    ) -> Result<()> {
        // Enforce 9 decimals for both tokens
        require!(
            self.mint_x.decimals == DECIMALS,
            AMMError::InvalidPrecision
        );
        require!(
            self.mint_y.decimals == DECIMALS,
            AMMError::InvalidPrecision
        );

        // Validate amounts
        require!(amount_x > 0, AMMError::InvalidAmount);
        require!(amount_y > 0, AMMError::InvalidAmount);

        // Initialize config (locked and not whitelisted yet)
        self.config.set_inner(Config {
            seed,
            authority,
            mint_x: self.mint_x.key(),
            mint_y: self.mint_y.key(),
            fee,
            locked: true,
            whitelisted: false,
            config_bump: bumps.config,
            lp_bump: bumps.mint_lp,
            admins: Vec::new(), // Will be set by program upgrade authority
            reserved: [0; 16],
        });

        // Initialize escrow state
        self.escrow.set_inner(EscrowState {
            pool_seed: seed,
            creator: self.creator.key(),
            mint_x: self.mint_x.key(),
            mint_y: self.mint_y.key(),
            amount_x,
            amount_y,
            status: EscrowStatus::Pending,
            created_at: Clock::get()?.unix_timestamp,
            bump: bumps.escrow,
        });

        // Transfer initial liquidity to escrow vaults
        // Transfer token X
        let transfer_x_ctx = CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.creator_token_x.to_account_info(),
                to: self.escrow_vault_x.to_account_info(),
                authority: self.creator.to_account_info(),
            },
        );
        transfer(transfer_x_ctx, amount_x)?;

        // Transfer token Y
        let transfer_y_ctx = CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.creator_token_y.to_account_info(),
                to: self.escrow_vault_y.to_account_info(),
                authority: self.creator.to_account_info(),
            },
        );
        transfer(transfer_y_ctx, amount_y)?;

        msg!("Pool created with escrow. Seed: {}, Amount X: {}, Amount Y: {}", seed, amount_x, amount_y);

        Ok(())
    }
}
