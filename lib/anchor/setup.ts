import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { IDL, type AmmAnchor } from './idl';

// Program ID from Anchor.toml
export const AMM_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_AMM_PROGRAM_ID || '4XqThpjUnqqeg4vESBgzexS15cjBp82jsFTcH7XzTxko'
);

/**
 * Get Anchor program instance
 */
export function getAmmProgram(
  connection: Connection,
  wallet: AnchorWallet
): Program<AmmAnchor> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  return new Program(IDL, AMM_PROGRAM_ID, provider);
}

/**
 * Derive pool config PDA
 */
export function getConfigPDA(seed: bigint): [PublicKey, number] {
  const seedBuffer = Buffer.alloc(8);
  seedBuffer.writeBigUInt64LE(seed);

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
 * Note: This requires iterating through seeds or maintaining a registry
 * For now, we'll use a deterministic seed based on token mint addresses
 */
export function derivePoolSeed(mintX: PublicKey, mintY: PublicKey): bigint {
  // Ensure consistent ordering (smaller pubkey first)
  const [mint1, mint2] = mintX.toBuffer().compare(mintY.toBuffer()) < 0
    ? [mintX, mintY]
    : [mintY, mintX];

  // Create a simple hash from the two mint addresses
  // In production, you might want to use a more sophisticated approach
  const combined = Buffer.concat([mint1.toBuffer(), mint2.toBuffer()]);
  const hash = combined.slice(0, 8);

  return hash.readBigUInt64LE(0);
}
