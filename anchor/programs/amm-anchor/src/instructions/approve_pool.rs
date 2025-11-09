use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer, mint_to, MintTo}
};

use crate::{Config, EscrowState, EscrowStatus, error::AMMError};

#[derive(Accounts)]
pub struct ApprovePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub mint_x: Account<'info, Mint>,
    pub mint_y: Account<'info, Mint>,

    /// Pool config
    #[account(mut)]
    pub config: Account<'info, Config>,

    /// Escrow state
    #[account(
        mut,
        seeds = [b"escrow", config.key().as_ref()],
        bump = escrow.bump,
        constraint = escrow.status == EscrowStatus::Pending @ AMMError::InvalidEscrowStatus,
    )]
    pub escrow: Account<'info, EscrowState>,

    /// Escrow vaults (source of initial liquidity)
    #[account(
        mut,
        associated_token::mint = mint_x,
        associated_token::authority = escrow,
    )]
    pub escrow_vault_x: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint_y,
        associated_token::authority = escrow,
    )]
    pub escrow_vault_y: Account<'info, TokenAccount>,

    /// Pool vaults (destination for initial liquidity)
    /// These should be created during pool creation, not approval
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint_x,
        associated_token::authority = config,
    )]
    pub vault_x: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint_y,
        associated_token::authority = config,
    )]
    pub vault_y: Account<'info, TokenAccount>,

    /// LP mint
    #[account(
        mut,
        seeds = [b"lp", config.key().as_ref()],
        bump = config.lp_bump,
    )]
    pub mint_lp: Account<'info, Mint>,

    /// CHECK: Creator account to receive rent refund
    #[account(mut, address = escrow.creator)]
    pub creator: UncheckedAccount<'info>,

    /// Creator's LP token account (to receive LP tokens)
    /// Created by admin during approval
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint_lp,
        associated_token::authority = creator,
    )]
    pub creator_lp_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> ApprovePool<'info> {
    pub fn approve_pool(&mut self) -> Result<()> {
        // Verify mints match config
        require!(
            self.mint_x.key() == self.config.mint_x,
            AMMError::InvalidAmount
        );
        require!(
            self.mint_y.key() == self.config.mint_y,
            AMMError::InvalidAmount
        );
        // Verify creator matches escrow
        require!(
            self.creator.key() == self.escrow.creator,
            AMMError::InvalidAuthority
        );

        // Verify admin authority
        // Note: In production, you'd check against config.admins Vec
        // For now, we'll allow any admin to approve (can be restricted later)

        // Get escrow PDA seeds for signing
        let config_key = self.config.key();
        let escrow_bump = self.escrow.bump;
        let escrow_seeds = &[
            b"escrow",
            config_key.as_ref(),
            &[escrow_bump],
        ];
        let escrow_signer = &[&escrow_seeds[..]];

        // Transfer tokens from escrow to pool vaults
        // Transfer token X
        let transfer_x_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            Transfer {
                from: self.escrow_vault_x.to_account_info(),
                to: self.vault_x.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
            escrow_signer,
        );
        transfer(transfer_x_ctx, self.escrow.amount_x)?;

        // Transfer token Y
        let transfer_y_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            Transfer {
                from: self.escrow_vault_y.to_account_info(),
                to: self.vault_y.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
            escrow_signer,
        );
        transfer(transfer_y_ctx, self.escrow.amount_y)?;

        // Calculate LP tokens to mint (using geometric mean for initial deposit)
        let lp_amount = (self.escrow.amount_x as u128)
            .checked_mul(self.escrow.amount_y as u128)
            .ok_or(AMMError::Overflow)?;
        let lp_amount = (lp_amount as f64).sqrt() as u64;

        // Mint LP tokens to creator
        let config_seed = self.config.seed;
        let config_bump = self.config.config_bump;
        let seed_bytes = config_seed.to_le_bytes();
        let config_seeds = &[
            b"config",
            seed_bytes.as_ref(),
            &[config_bump],
        ];
        let config_signer = &[&config_seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.mint_lp.to_account_info(),
                to: self.creator_lp_account.to_account_info(),
                authority: self.config.to_account_info(),
            },
            config_signer,
        );
        mint_to(mint_ctx, lp_amount)?;

        // Update config state
        self.config.locked = false;
        self.config.whitelisted = true;

        // Update escrow state
        self.escrow.status = EscrowStatus::Approved;

        msg!("Pool approved! LP tokens minted: {}", lp_amount);

        Ok(())
    }
}
