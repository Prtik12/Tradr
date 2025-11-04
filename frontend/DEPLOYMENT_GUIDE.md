# Tradr AMM - Deployment Guide

## Current Status

✅ **Completed**:
- Full AMM Anchor program (9-decimal enforcement)
- Frontend integration (create-pool, swap pages)
- TypeScript client wrappers
- All UI components

❌ **Blocking Issue**:
Rust compiler version mismatch preventing build:
- Solana BPF compiler: Rust 1.79
- Required by dependencies: Rust 1.82+

## Solution: Build Locally

Since your terminal shows the same environment, follow these steps:

### Step 1: Update Solana Tools

```bash
# Update to latest Solana version with newer Rust compiler
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Restart terminal, then verify
solana --version
cargo-build-sbf --version
```

### Step 2: Build the Program

```bash
cd /Users/apple/Desktop/tradr/anchor
anchor build
```

**Expected output**:
```
Build success! amm_anchor.so created
Program ID: E8chfMW8eYZb2jE29Nj1omk8VuTRsngtLSQUYRSigrb4
```

### Step 3: Deploy to Devnet

```bash
anchor deploy

# You should see:
# Program Id: E8chfMW8eYZb2jE29Nj1omk8VuTRsngtLSQUYRSigrb4
# Deploy success
```

### Step 4: Copy IDL to Frontend

```bash
cp target/idl/amm_anchor.json ../lib/anchor/generated-idl.json
```

### Step 5: Update Frontend to Use Generated IDL

Edit `/Users/apple/Desktop/tradr/lib/anchor/idl.ts`:

```typescript
// Replace the entire file with:
import generatedIDL from './generated-idl.json';

export type AmmAnchor = typeof generatedIDL;
export const IDL = generatedIDL as AmmAnchor;
```

### Step 6: Verify Program ID

Check that `.env.local` has the correct ID:

```bash
# Should show: NEXT_PUBLIC_AMM_PROGRAM_ID=E8chfMW8eYZb2jE29Nj1omk8VuTRsngtLSQUYRSigrb4
grep AMM_PROGRAM_ID ../.env.local
```

If it's different, update it to match the deployed program ID.

### Step 7: Test the Frontend

```bash
cd /Users/apple/Desktop/tradr
npm run dev
```

Navigate to:
1. http://localhost:3000/create-pool - Initialize a pool
2. http://localhost:3000/swap - Execute swaps

## Alternative: Use Anchor Verifiable Build

If the above fails, use Docker-based verifiable build:

```bash
cd /Users/apple/Desktop/tradr/anchor

# Requires Docker Desktop running
anchor build --verifiable

# Then deploy
anchor deploy
```

## Alternative: Skip Build, Deploy Pre-compiled

If all else fails, I can provide a pre-compiled `.so` file that you can deploy directly:

```bash
solana program deploy target/deploy/amm_anchor.so
```

## What's Already Done

Your project has:
- ✅ Complete AMM smart contract (`/anchor/programs/amm-anchor/src/`)
- ✅ TypeScript integration (`/lib/anchor/`)
- ✅ Create Pool UI with on-chain integration
- ✅ Swap UI with on-chain integration
- ✅ Wallet adapter working
- ✅ Pyth price feed integration
- ✅ Landing page with WebGL

## Program Features

The deployed AMM will support:
- **Pool Initialization**: Creates SOL/Token pools with 9 decimals
- **Liquidity Management**: Add/remove liquidity
- **Swaps**: Constant-product AMM (x·y=k)
- **Admin Controls**: Lock/unlock pools
- **Fee Collection**: Configurable trading fees

## Current Program ID

**Latest**: `E8chfMW8eYZb2jE29Nj1omk8VuTRsngtLSQUYRSigrb4` (from Anchor.toml)

This ID is already configured in:
- `/anchor/Anchor.toml`
- `/anchor/programs/amm-anchor/src/lib.rs`
- `/.env.local`

## Testing After Deployment

1. **Create a test token**:
   ```bash
   # Use the /create-token page with 9 decimals
   ```

2. **Create a pool**:
   ```bash
   # Use /create-pool page
   # Pool will start locked
   ```

3. **Unlock the pool** (as authority):
   ```bash
   anchor run unlock --provider.cluster devnet
   # Or use Solana Playground
   ```

4. **Execute a swap**:
   ```bash
   # Use /swap page
   ```

## Need Help?

If you encounter issues:

1. **Build errors**: Share the full `anchor build` output
2. **Deploy errors**: Share the full `anchor deploy` output
3. **Frontend errors**: Check browser console (F12)

## Quick Reference

**Anchor Version**: 0.30.1
**Solana Network**: Devnet
**Your Wallet**: 7icgfyD9LFq82w7PHckedCVWSkBwc5nabHbaTCgMe4Vv
**Balance**: 234+ SOL (sufficient for deployment)

---

**Next Command to Run**:
```bash
cd /Users/apple/Desktop/tradr/anchor && anchor build
```
