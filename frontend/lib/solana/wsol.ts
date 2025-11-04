import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  closeAccount,
} from '@solana/spl-token';

/**
 * Get user's WSOL (Wrapped SOL) balance
 */
export async function getWSOLBalance(
  connection: Connection,
  wallet: PublicKey
): Promise<number> {
  try {
    const wsolAta = await getAssociatedTokenAddress(NATIVE_MINT, wallet);

    const accountInfo = await connection.getAccountInfo(wsolAta);
    if (!accountInfo) {
      return 0;
    }

    const tokenAccount = await getAccount(connection, wsolAta);
    return Number(tokenAccount.amount) / LAMPORTS_PER_SOL;
  } catch (error) {
    // Account doesn't exist
    return 0;
  }
}

/**
 * Wrap SOL to WSOL (create WSOL ATA and transfer SOL)
 */
export async function wrapSOL(
  connection: Connection,
  wallet: PublicKey,
  amountSol: number
): Promise<Transaction> {
  const wsolAta = await getAssociatedTokenAddress(NATIVE_MINT, wallet);

  const transaction = new Transaction();

  // Check if WSOL ATA exists
  const accountInfo = await connection.getAccountInfo(wsolAta);
  if (!accountInfo) {
    // Create WSOL ATA
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet, // payer
        wsolAta, // ata
        wallet, // owner
        NATIVE_MINT // mint
      )
    );
  }

  // Transfer SOL to WSOL ATA
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet,
      toPubkey: wsolAta,
      lamports,
    })
  );

  // Sync native (convert SOL to WSOL)
  transaction.add(createSyncNativeInstruction(wsolAta, TOKEN_PROGRAM_ID));

  return transaction;
}

/**
 * Unwrap WSOL to SOL (close WSOL account, returns SOL to wallet)
 */
export async function unwrapWSOL(
  connection: Connection,
  wallet: PublicKey,
  payer: PublicKey
): Promise<Transaction> {
  const wsolAta = await getAssociatedTokenAddress(NATIVE_MINT, wallet);

  const transaction = new Transaction();

  // Close WSOL account (automatically unwraps to SOL)
  transaction.add(
    await closeAccount(
      connection,
      payer,
      wsolAta,
      wallet, // destination for SOL
      wallet, // authority
      [],
      undefined,
      TOKEN_PROGRAM_ID
    )
  );

  return transaction;
}

/**
 * Get SOL balance
 */
export async function getSOLBalance(
  connection: Connection,
  wallet: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(wallet);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Calculate required WSOL for pool creation
 */
export function calculateRequiredWSOL(amountSol: number): number {
  // Add 0.02 SOL buffer for rent and transaction fees
  return amountSol + 0.02;
}

/**
 * Check if user has enough WSOL, return deficit
 */
export async function checkWSOLDeficit(
  connection: Connection,
  wallet: PublicKey,
  requiredAmount: number
): Promise<{ hasEnough: boolean; deficit: number; currentBalance: number }> {
  const currentBalance = await getWSOLBalance(connection, wallet);
  const hasEnough = currentBalance >= requiredAmount;
  const deficit = hasEnough ? 0 : requiredAmount - currentBalance;

  return {
    hasEnough,
    deficit,
    currentBalance,
  };
}
