# Tradr AMM Anchor Program

A constant-product automated market maker (AMM) built with Anchor for Solana, enforcing 9-decimal precision for all tokens.

## Features

- **9-Decimal Enforcement**: All tokens must have 9 decimals (SOL compatibility)
- **Constant Product Formula**: Uses x·y=k AMM algorithm
- **Pool Locking**: Pools start locked and require authority approval
- **Configurable Fees**: Set trading fees per pool (in basis points)
- **Slippage Protection**: Built-in slippage guards for swaps
- **Admin Controls**: Lock/unlock pools as needed

## Program Structure

```
programs/amm-anchor/src/
├── lib.rs                      # Program entry point
├── constants.rs                # Global constants (DECIMALS = 9)
├── error.rs                    # Custom error types
├── instructions/
│   ├── initialize_pool.rs      # Create new pool
│   ├── deposit_asset.rs        # Add liquidity
│   ├── withdraw_asset.rs       # Remove liquidity
│   ├── swap.rs                 # Execute swaps
│   └── update.rs               # Lock/unlock pool
└── state/
    └── mod.rs                  # Config account structure
```

## Prerequisites

Before building and deploying, ensure you have:

- Rust 1.70+ installed
- Solana CLI 1.18+ installed
- Anchor CLI 0.31.1 installed
- A Solana wallet with devnet SOL

### Installation

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli
```

## Build & Deploy

### 1. Install Dependencies

```bash
cd anchor
npm install
```

### 2. Configure Solana CLI

```bash
# Set cluster to devnet
solana config set --url devnet

# Create or use existing keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Airdrop some SOL for deployment
solana airdrop 2
```

### 3. Build the Program

```bash
anchor build
```

This will:
- Compile the Rust program
- Generate the IDL file at `target/idl/amm_anchor.json`
- Generate TypeScript types

### 4. Deploy to Devnet

```bash
anchor deploy
```

After deployment, the program ID will be displayed. Update it in:
- `Anchor.toml` → `[programs.devnet]`
- `/Users/apple/Desktop/tradr/.env.local` → `NEXT_PUBLIC_AMM_PROGRAM_ID`
- `programs/amm-anchor/src/lib.rs` → `declare_id!()`

### 5. Copy IDL to Frontend

```bash
cp target/idl/amm_anchor.json ../lib/anchor/generated-idl.json
```

Then update `/lib/anchor/idl.ts` to import the generated IDL:

```typescript
import generatedIDL from './generated-idl.json';
export const IDL = generatedIDL as AmmAnchor;
```

## Program Instructions

### Initialize Pool

Creates a new liquidity pool for a token pair.

**Parameters:**
- `seed`: Unique identifier for the pool (u64)
- `fee`: Trading fee in basis points (e.g., 300 = 3%)
- `authority`: Optional admin pubkey who can lock/unlock

**Constraints:**
- Both tokens MUST have 9 decimals
- Pool starts in `locked: true` state
- LP mint created with 9 decimals

### Deposit Liquidity

Add liquidity to an existing pool.

**Parameters:**
- `amount`: LP tokens to mint (u64)
- `max_x`: Maximum X tokens to deposit (slippage protection)
- `max_y`: Maximum Y tokens to deposit (slippage protection)

**Constraints:**
- Pool must be unlocked
- Amounts calculated using constant-product formula

### Swap

Execute a token swap.

**Parameters:**
- `is_x`: Direction (true = X→Y, false = Y→X)
- `amount`: Input token amount (u64)
- `min`: Minimum output amount (slippage protection)

**Constraints:**
- Pool must be unlocked
- Slippage check enforced on-chain

### Withdraw Liquidity

Remove liquidity from pool.

**Parameters:**
- `amount`: LP tokens to burn (u64)
- `min_x`: Minimum X tokens to receive
- `min_y`: Minimum Y tokens to receive

**Constraints:**
- Pool must be unlocked
- Proportional withdrawal based on LP share

### Lock / Unlock

Admin-only functions to pause/resume pool.

**Constraints:**
- Only pool authority can call
- Locks prevent swaps and liquidity changes

## Program Accounts

### Config

Pool configuration account (PDA).

**Seeds:** `["config", seed]`

**Fields:**
- `seed`: Pool identifier (u64)
- `authority`: Admin pubkey (Option<Pubkey>)
- `mint_x`: Token X mint address
- `mint_y`: Token Y mint address
- `fee`: Trading fee in basis points (u16)
- `locked`: Pool lock status (bool)
- `config_bump`: PDA bump seed (u8)
- `lp_bump`: LP mint PDA bump (u8)

### LP Mint

Liquidity provider token mint (PDA).

**Seeds:** `["lp", config_pubkey]`

**Properties:**
- Decimals: 9 (matches base tokens)
- Authority: Config PDA

## Testing

Run the test suite:

```bash
anchor test
```

Tests include:
- Pool initialization with 9-decimal tokens
- Liquidity deposit (first + subsequent)
- Swaps in both directions (X→Y, Y→X)
- Lock/unlock functionality
- Liquidity withdrawal

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | PoolLocked | Pool is currently locked |
| 6001 | InvalidAmount | Amount must be > 0 |
| 6002 | SlippageExceeded | Output below minimum |
| 6003 | Overflow | Arithmetic overflow |
| 6004 | Underflow | Arithmetic underflow |
| 6005 | InvalidAuthority | Not pool authority |
| 6006 | InvalidPrecision | Token must have 9 decimals |
| 6007 | InsufficientBalance | Insufficient balance |
| 6008 | ZeroBalance | Balance is zero |

## Frontend Integration

The frontend uses the TypeScript client in `/lib/anchor/`:

```typescript
import { initializePool, executeSwap, depositLiquidity } from '@/lib/anchor';

// Initialize a pool
const signature = await initializePool({
  connection,
  wallet: anchorWallet,
  mintX: SOL_MINT,
  mintY: tokenMint,
  fee: 300, // 3%
  authority: publicKey,
});

// Execute a swap
const signature = await executeSwap({
  connection,
  wallet: anchorWallet,
  mintX: SOL_MINT,
  mintY: tokenMint,
  isX: true, // SOL → Token
  amount: 1.0, // 1 SOL
  minOut: 95.0, // Minimum 95 tokens (5% slippage)
});
```

## Security Considerations

1. **Decimal Enforcement**: On-chain validation ensures all tokens have 9 decimals
2. **Slippage Protection**: Min/max amount checks prevent sandwich attacks
3. **Lock Mechanism**: Pools can be paused in emergencies
4. **Authority Control**: Only designated authority can lock/unlock
5. **Constant Product**: Mathematically sound AMM formula

## Upgradeability

The program is **not** upgradeable by default. To make it upgradeable:

1. Deploy with `--upgradeable` flag
2. Set upgrade authority: `solana program set-upgrade-authority`
3. Store upgrade authority keypair securely

## License

MIT

## Support

For issues or questions:
- GitHub: [Your repo URL]
- Discord: [Your Discord server]
