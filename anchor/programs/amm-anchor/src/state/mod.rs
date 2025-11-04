use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub seed: u64,
    pub authority: Option<Pubkey>,
    pub mint_x: Pubkey,
    pub mint_y: Pubkey,
    pub fee: u16,
    pub locked: bool,
    pub whitelisted: bool,
    pub config_bump: u8,
    pub lp_bump: u8,
    pub admins: Vec<Pubkey>,
    pub reserved: [u8; 16],
}

impl Space for Config {
    const INIT_SPACE: usize = 8 + 8 + (1 + 32) + (32 * 2) + 2 + 1 + 1 + 1 + 1 + (4 + 32 * 5) + 16;
}

#[account]
pub struct EscrowState {
    pub pool_seed: u64,
    pub creator: Pubkey,
    pub mint_x: Pubkey,
    pub mint_y: Pubkey,
    pub amount_x: u64,
    pub amount_y: u64,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub bump: u8,
}

impl Space for EscrowState {
    const INIT_SPACE: usize = 8 + 8 + 32 + 32 + 32 + 8 + 8 + 1 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Pending,
    Approved,
    Rejected,
}
