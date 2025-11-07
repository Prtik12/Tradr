import { BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
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

export interface CreatePoolWithEscrowParams {
  connection: Connection;
  wallet: AnchorWallet;
  mintX: PublicKey;
  mintY: PublicKey;
  fee: number; // Basis points (e.g., 300 = 3%)
  authority: PublicKey;
  amountX: number; // Initial liquidity for X token
  amountY: number; // Initial liquidity for Y token
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
 * Create a new AMM pool with escrow (requires admin approval)
 */
export async function createPoolWithEscrow(params: CreatePoolWithEscrowParams): Promise<{
  signature: string;
  configAddress: string;
  escrowAddress: string;
  seed: bigint;
}> {
  const { connection, wallet, mintX, mintY, fee, authority, amountX, amountY } = params;

  const program = getAmmProgram(connection, wallet);
  const seed = derivePoolSeed(mintX, mintY);

  const [config] = getConfigPDA(seed);
  const [mintLp] = getLpMintPDA(config);

  // Derive escrow PDA
  const [escrowAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), config.toBuffer()],
    program.programId
  );

  // Get creator's token accounts
  const creatorTokenX = await getAssociatedTokenAddress(mintX, wallet.publicKey);
  const creatorTokenY = await getAssociatedTokenAddress(mintY, wallet.publicKey);

  // Escrow vaults will be created by the program
  const escrowVaultX = await getAssociatedTokenAddress(mintX, escrowAddress, true);
  const escrowVaultY = await getAssociatedTokenAddress(mintY, escrowAddress, true);

  // Convert amounts to base units (9 decimals)
  const amountXBN = new BN(Math.floor(amountX * 10 ** 9));
  const amountYBN = new BN(Math.floor(amountY * 10 ** 9));

  // Build transaction with ATA creation instructions
  const transaction = new Transaction();

  // Check if creator's token accounts exist
  const [creatorXInfo, creatorYInfo] = await Promise.all([
    connection.getAccountInfo(creatorTokenX),
    connection.getAccountInfo(creatorTokenY),
  ]);

  // Create creatorTokenX ATA if it doesn't exist (WSOL)
  if (!creatorXInfo) {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, // payer
        creatorTokenX, // associated token account
        wallet.publicKey, // owner
        mintX, // mint (WSOL)
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Create creatorTokenY ATA if it doesn't exist (custom token)
  if (!creatorYInfo) {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, // payer
        creatorTokenY, // associated token account
        wallet.publicKey, // owner
        mintY, // mint (custom token)
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Wrap SOL to WSOL (if mintX is native SOL)
  if (mintX.equals(NATIVE_MINT)) {
    const lamports = Math.floor(amountX * 10 ** 9);

    // Transfer SOL to WSOL ATA
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: creatorTokenX,
        lamports,
      })
    );

    // Sync native to update WSOL balance
    transaction.add(createSyncNativeInstruction(creatorTokenX));
  }

  // Add the createPoolWithEscrow instruction
  const createPoolInstruction = await program.methods
    .createPoolWithEscrow(
      new BN(seed.toString()),
      fee,
      authority,
      amountXBN,
      amountYBN
    )
    .accounts({
      creator: wallet.publicKey,
      mintX,
      mintY,
      config,
      escrow: escrowAddress,
      escrowVaultX,
      escrowVaultY,
      creatorTokenX,
      creatorTokenY,
      mintLp,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  transaction.add(createPoolInstruction);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign and send transaction
  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());

  // Confirm transaction
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  return {
    signature,
    configAddress: config.toString(),
    escrowAddress: escrowAddress.toString(),
    seed,
  };
}

/**
 * Execute a swap with automatic ATA creation
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

  // Build transaction with ATA creation instructions
  const transaction = new Transaction();

  // Check if user's token accounts exist, if not create them
  const [userXInfo, userYInfo] = await Promise.all([
    connection.getAccountInfo(userX),
    connection.getAccountInfo(userY),
  ]);

  // Create userX ATA if it doesn't exist
  if (!userXInfo) {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, // payer
        userX, // associated token account
        wallet.publicKey, // owner
        mintX, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Create userY ATA if it doesn't exist
  if (!userYInfo) {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey, // payer
        userY, // associated token account
        wallet.publicKey, // owner
        mintY, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Wrap SOL if swapping native SOL
  // Check if input token is native SOL (NATIVE_MINT)
  if (isX && mintX.equals(NATIVE_MINT)) {
    // Swapping SOL for token - need to wrap SOL
    const lamports = Math.floor(amount * 10 ** 9);

    // Transfer SOL to WSOL ATA
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: userX,
        lamports,
      })
    );

    // Sync native to update WSOL balance
    transaction.add(createSyncNativeInstruction(userX));
  } else if (!isX && mintY.equals(NATIVE_MINT)) {
    // Swapping token for SOL - need to ensure WSOL ATA is ready
    // (The wrapping happens automatically when receiving)
  }

  // Add the swap instruction
  const swapInstruction = await program.methods
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
    .instruction();

  transaction.add(swapInstruction);

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign and send transaction
  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());

  // Confirm transaction
  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  return signature;
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

/**
 * Approve a pool request - transfers tokens from escrow to pool vaults
 */
export async function approvePool(
  connection: Connection,
  wallet: AnchorWallet,
  configAddress: PublicKey,
  mintX: PublicKey,
  mintY: PublicKey,
  creatorAddress: PublicKey
): Promise<string> {
  const program = getAmmProgram(connection, wallet);

  // Derive PDAs
  const [mintLp] = getLpMintPDA(configAddress);

  // Derive escrow PDA
  const [escrowAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), configAddress.toBuffer()],
    program.programId
  );

  // Get all token accounts
  const vaultX = await getAssociatedTokenAddress(mintX, configAddress, true);
  const vaultY = await getAssociatedTokenAddress(mintY, configAddress, true);
  const escrowVaultX = await getAssociatedTokenAddress(mintX, escrowAddress, true);
  const escrowVaultY = await getAssociatedTokenAddress(mintY, escrowAddress, true);
  const creatorLpAccount = await getAssociatedTokenAddress(mintLp, creatorAddress);

  const tx = await program.methods
    .approvePool()
    .accounts({
      admin: wallet.publicKey,
      mintX,
      mintY,
      config: configAddress,
      escrow: escrowAddress,
      escrowVaultX,
      escrowVaultY,
      vaultX,
      vaultY,
      mintLp,
      creator: creatorAddress,
      creatorLpAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

/**
 * Reject a pool request - returns tokens from escrow to creator
 */
export async function rejectPool(
  connection: Connection,
  wallet: AnchorWallet,
  configAddress: PublicKey,
  mintX: PublicKey,
  mintY: PublicKey,
  creatorAddress: PublicKey
): Promise<string> {
  const program = getAmmProgram(connection, wallet);

  // Derive escrow PDA
  const [escrowAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), configAddress.toBuffer()],
    program.programId
  );

  // Get token accounts
  const escrowVaultX = await getAssociatedTokenAddress(mintX, escrowAddress, true);
  const escrowVaultY = await getAssociatedTokenAddress(mintY, escrowAddress, true);
  const creatorTokenX = await getAssociatedTokenAddress(mintX, creatorAddress);
  const creatorTokenY = await getAssociatedTokenAddress(mintY, creatorAddress);

  const tx = await program.methods
    .rejectPool()
    .accounts({
      admin: wallet.publicKey,
      mintX,
      mintY,
      config: configAddress,
      escrow: escrowAddress,
      escrowVaultX,
      escrowVaultY,
      creatorTokenX,
      creatorTokenY,
      creator: creatorAddress,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}
