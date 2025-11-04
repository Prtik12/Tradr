import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { IDL, type AmmAnchor } from './idl';

// Validate program ID is configured
const programIdString = process.env.NEXT_PUBLIC_AMM_PROGRAM_ID;

if (!programIdString) {
  throw new Error(
    'NEXT_PUBLIC_AMM_PROGRAM_ID is not configured in environment variables. ' +
    'Please add it to your .env.local file.'
  );
}

// Program ID from Anchor.toml (deployed program)
export const AMM_PROGRAM_ID = new PublicKey(programIdString);

/**
 * Get Anchor program instance
 */
export function getAmmProgram(
  connection: Connection,
  wallet: AnchorWallet
): Program<AmmAnchor> {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected. Please connect your wallet to continue.');
  }

  if (!connection) {
    throw new Error('Connection not established. Please check your network connection.');
  }

  try {
    // Create Anchor provider
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    // Create program instance with generated IDL (Anchor v0.31+ API)
    // Use generic type parameter for proper type inference
    // The IDL already contains the address, no need to pass it separately
    const program = new Program<AmmAnchor>(IDL, provider);

    console.log('[getAmmProgram] ✅ Program initialized successfully');
    console.log('[getAmmProgram] Program ID:', program.programId.toString());

    return program;
  } catch (error) {
    console.error('[getAmmProgram] ❌ Failed to initialize Anchor program:', error);
    throw new Error(
      `Failed to initialize Anchor program: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Derive pool config PDA
 */
export function getConfigPDA(seed: bigint): [PublicKey, number] {
  // Browser-compatible: Manual little-endian encoding of 64-bit unsigned integer
  // This replaces seedBuffer.writeBigUInt64LE(seed) which doesn't exist in browsers
  const seedBuffer = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    seedBuffer[i] = Number((seed >> BigInt(i * 8)) & 0xFFn);
  }

  return PublicKey.findProgramAddressSync(
    [Buffer.from('config'), seedBuffer],
    AMM_PROGRAM_ID
  );
}

/**
 * Derive LP mint PDA
 */
export function getLpMintPDA(config: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lp'), config.toBuffer()],
    AMM_PROGRAM_ID
  );
}

/**
 * Find pool config for a given token pair
 * Uses SHA256 hash to ensure each unique token pair gets a unique seed
 */
export function derivePoolSeed(mintX: PublicKey, mintY: PublicKey): bigint {
  // Ensure consistent ordering (smaller pubkey first)
  const [mint1, mint2] = mintX.toBuffer().compare(mintY.toBuffer()) < 0
    ? [mintX, mintY]
    : [mintY, mintX];

  // Use SHA256 to properly mix both mint addresses
  // This ensures each unique token pair gets a unique seed
  const combined = Buffer.concat([mint1.toBuffer(), mint2.toBuffer()]);

  // Browser-compatible SHA256 hash
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(combined).digest();
  const hashBytes = hash.slice(0, 8);

  // Convert 8 bytes to BigInt (little-endian)
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(hashBytes[i]) << BigInt(i * 8);
  }

  return value;
}
