import { BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { getAmmProgram, getConfigPDA, getLpMintPDA, derivePoolSeed } from './setup';

export interface InitializePoolParams {
  connection: Connection;
  wallet: AnchorWallet;
  mintX: PublicKey;
  mintY: PublicKey;
  fee: number; // Basis points (e.g., 300 = 3%)
  authority?: PublicKey;
}

export interface SwapParams {
  connection: Connection;
  wallet: AnchorWallet;
  mintX: PublicKey;
  mintY: PublicKey;
  isX: boolean; // true if swapping X for Y, false if swapping Y for X
  amount: number; // In token decimals (9)
  minOut: number; // Minimum output amount (slippage protection)
}

export interface DepositParams {
  connection: Connection;
  wallet: AnchorWallet;
  mintX: PublicKey;
  mintY: PublicKey;
  lpAmount: number; // Desired LP tokens to receive
  maxX: number; // Maximum X tokens to deposit
  maxY: number; // Maximum Y tokens to deposit
}

/**
 * Initialize a new AMM pool
 */
export async function initializePool(params: InitializePoolParams): Promise<string> {
  const { connection, wallet, mintX, mintY, fee, authority } = params;

  const program = getAmmProgram(connection, wallet);
  const seed = derivePoolSeed(mintX, mintY);

  const [config] = getConfigPDA(seed);
  const [mintLp] = getLpMintPDA(config);

  const vaultX = await getAssociatedTokenAddress(mintX, config, true);
  const vaultY = await getAssociatedTokenAddress(mintY, config, true);

  const tx = await program.methods
    .initialize(
      new BN(seed.toString()),
      fee,
      authority || null
    )
    .accounts({
      admin: wallet.publicKey,
      mintX,
      mintY,
      config,
      mintLp,
      vaultX,
      vaultY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Execute a swap
 */
export async function executeSwap(params: SwapParams): Promise<string> {
  const { connection, wallet, mintX, mintY, isX, amount, minOut } = params;

  const program = getAmmProgram(connection, wallet);
  const seed = derivePoolSeed(mintX, mintY);

  const [config] = getConfigPDA(seed);
  const [mintLp] = getLpMintPDA(config);

  const vaultX = await getAssociatedTokenAddress(mintX, config, true);
  const vaultY = await getAssociatedTokenAddress(mintY, config, true);
  const userX = await getAssociatedTokenAddress(mintX, wallet.publicKey);
  const userY = await getAssociatedTokenAddress(mintY, wallet.publicKey);

  // Convert amounts to base units (9 decimals)
  const amountBN = new BN(amount * 10 ** 9);
  const minOutBN = new BN(minOut * 10 ** 9);

  const tx = await program.methods
    .swap(isX, amountBN, minOutBN)
    .accounts({
      user: wallet.publicKey,
      mintX,
      mintY,
      config,
      mintLp,
      vaultX,
      vaultY,
      userX,
      userY,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Deposit liquidity to pool
 */
export async function depositLiquidity(params: DepositParams): Promise<string> {
  const { connection, wallet, mintX, mintY, lpAmount, maxX, maxY } = params;

  const program = getAmmProgram(connection, wallet);
  const seed = derivePoolSeed(mintX, mintY);

  const [config] = getConfigPDA(seed);
  const [mintLp] = getLpMintPDA(config);

  const vaultX = await getAssociatedTokenAddress(mintX, config, true);
  const vaultY = await getAssociatedTokenAddress(mintY, config, true);
  const userX = await getAssociatedTokenAddress(mintX, wallet.publicKey);
  const userY = await getAssociatedTokenAddress(mintY, wallet.publicKey);
  const userLp = await getAssociatedTokenAddress(mintLp, wallet.publicKey);

  // Convert amounts to base units (9 decimals)
  const lpAmountBN = new BN(lpAmount * 10 ** 9);
  const maxXBN = new BN(maxX * 10 ** 9);
  const maxYBN = new BN(maxY * 10 ** 9);

  const tx = await program.methods
    .deposit(lpAmountBN, maxXBN, maxYBN)
    .accounts({
      user: wallet.publicKey,
      mintX,
      mintY,
      config,
      mintLp,
      vaultX,
      vaultY,
      userX,
      userY,
      userLp,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Get pool config account data
 */
export async function getPoolConfig(
  connection: Connection,
  wallet: AnchorWallet,
  mintX: PublicKey,
  mintY: PublicKey
) {
  const program = getAmmProgram(connection, wallet);
  const seed = derivePoolSeed(mintX, mintY);
  const [config] = getConfigPDA(seed);

  try {
    const configAccount = await program.account.config.fetch(config);
    return {
      exists: true,
      config: configAccount,
      address: config,
      seed,
    };
  } catch (error) {
    return {
      exists: false,
      config: null,
      address: config,
      seed,
    };
  }
}

/**
 * Lock a pool (admin only)
 */
export async function lockPool(
  connection: Connection,
  wallet: AnchorWallet,
  mintX: PublicKey,
  mintY: PublicKey
): Promise<string> {
  const program = getAmmProgram(connection, wallet);
  const seed = derivePoolSeed(mintX, mintY);
  const [config] = getConfigPDA(seed);

  const tx = await program.methods
    .lock()
    .accounts({
      user: wallet.publicKey,
      config,
    })
    .rpc();

  return tx;
}

/**
 * Unlock a pool (admin only)
 */
export async function unlockPool(
  connection: Connection,
  wallet: AnchorWallet,
  mintX: PublicKey,
  mintY: PublicKey
): Promise<string> {
  const program = getAmmProgram(connection, wallet);
  const seed = derivePoolSeed(mintX, mintY);
  const [config] = getConfigPDA(seed);

  const tx = await program.methods
    .unlock()
    .accounts({
      user: wallet.publicKey,
      config,
    })
    .rpc();

  return tx;
}
