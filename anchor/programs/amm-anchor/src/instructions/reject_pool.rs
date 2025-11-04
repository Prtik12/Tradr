use anchor_lang::prelude::*;
use anchor_spl::{
    token::{transfer, close_account, Token, TokenAccount, Transfer, CloseAccount}
};

use crate::{Config, EscrowState, EscrowStatus, error::AMMError};

#[derive(Accounts)]
pub struct RejectPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

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

    /// Escrow vaults (to be drained and closed)
    #[account(
        mut,
        associated_token::mint = config.mint_x,
        associated_token::authority = escrow,
    )]
    pub escrow_vault_x: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = config.mint_y,
        associated_token::authority = escrow,
    )]
    pub escrow_vault_y: Account<'info, TokenAccount>,

    /// Creator's token accounts (to receive refund)
    #[account(
        mut,
        token::mint = config.mint_x,
        token::authority = escrow.creator,
    )]
    pub creator_token_x: Account<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = config.mint_y,
        token::authority = escrow.creator,
    )]
    pub creator_token_y: Account<'info, TokenAccount>,

    /// CHECK: Creator account to receive rent refund
    #[account(mut, address = escrow.creator)]
    pub creator: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> RejectPool<'info> {
    pub fn reject_pool(&mut self) -> Result<()> {
        // Verify admin authority
        // Note: In production, check against config.admins Vec

        // Get escrow PDA seeds for signing
        let config_key = self.config.key();
        let escrow_bump = self.escrow.bump;
        let escrow_seeds = &[
            b"escrow",
            config_key.as_ref(),
            &[escrow_bump],
        ];
        let escrow_signer = &[&escrow_seeds[..]];

        // Refund token X to creator
        if self.escrow_vault_x.amount > 0 {
            let transfer_x_ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.escrow_vault_x.to_account_info(),
                    to: self.creator_token_x.to_account_info(),
                    authority: self.escrow.to_account_info(),
                },
                escrow_signer,
            );
            transfer(transfer_x_ctx, self.escrow_vault_x.amount)?;
        }

        // Refund token Y to creator
        if self.escrow_vault_y.amount > 0 {
            let transfer_y_ctx = CpiContext::new_with_signer(
                self.token_program.to_account_info(),
                Transfer {
                    from: self.escrow_vault_y.to_account_info(),
                    to: self.creator_token_y.to_account_info(),
                    authority: self.escrow.to_account_info(),
                },
                escrow_signer,
            );
            transfer(transfer_y_ctx, self.escrow_vault_y.amount)?;
        }

        // Close escrow vault X (return rent to creator)
        let close_x_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.escrow_vault_x.to_account_info(),
                destination: self.creator.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
            escrow_signer,
        );
        close_account(close_x_ctx)?;

        // Close escrow vault Y (return rent to creator)
        let close_y_ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.escrow_vault_y.to_account_info(),
                destination: self.creator.to_account_info(),
                authority: self.escrow.to_account_info(),
            },
            escrow_signer,
        );
        close_account(close_y_ctx)?;

        // Update escrow status
        self.escrow.status = EscrowStatus::Rejected;

        msg!("Pool rejected. Funds returned to creator: {}", self.escrow.creator);

        Ok(())
    }
}
