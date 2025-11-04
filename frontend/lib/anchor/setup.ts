import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { IDL, type AmmAnchor } from './idl';

// Validate program ID is configured
const programIdString = process.env.NEXT_PUBLIC_AMM_PROGRAM_ID || '4XqThpjUnqqeg4vESBgzexS15cjBp82jsFTcH7XzTxko';

console.log('[setup.ts] Environment NEXT_PUBLIC_AMM_PROGRAM_ID:', process.env.NEXT_PUBLIC_AMM_PROGRAM_ID);
console.log('[setup.ts] Using program ID string:', programIdString);

if (!programIdString) {
  throw new Error(
    'NEXT_PUBLIC_AMM_PROGRAM_ID is not configured in environment variables. ' +
    'Please add it to your .env.local file.'
  );
}

// Program ID from Anchor.toml - with safe PublicKey creation
let AMM_PROGRAM_ID: PublicKey;
try {
  AMM_PROGRAM_ID = new PublicKey(programIdString);
  console.log('[setup.ts] AMM_PROGRAM_ID created successfully:', AMM_PROGRAM_ID.toString());
} catch (error) {
  console.error('[setup.ts] Failed to create PublicKey from:', programIdString, error);
  throw new Error(`Invalid program ID: ${programIdString}. Error: ${error}`);
}

export { AMM_PROGRAM_ID };

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
    // Verify AMM_PROGRAM_ID is valid before proceeding
    if (!AMM_PROGRAM_ID) {
      throw new Error('AMM_PROGRAM_ID is not initialized. This should never happen.');
    }
    console.log('[getAmmProgram] AMM_PROGRAM_ID verified:', AMM_PROGRAM_ID.toString());

    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    console.log('[getAmmProgram] AnchorProvider created successfully');

    // Log IDL structure for debugging
    console.log('[getAmmProgram] IDL type:', typeof IDL);
    console.log('[getAmmProgram] IDL metadata:', (IDL as any).metadata);
    console.log('[getAmmProgram] IDL metadata.address:', (IDL as any).metadata?.address);

    // Extract programId from IDL metadata if it exists, otherwise use AMM_PROGRAM_ID
    let programIdFromIdl: PublicKey | null = null;
    try {
      const idlAddress = (IDL as any).metadata?.address || (IDL as any).address;
      if (idlAddress) {
        programIdFromIdl = new PublicKey(idlAddress);
        console.log('[getAmmProgram] Program ID from IDL:', programIdFromIdl.toString());
      } else {
        console.log('[getAmmProgram] No program ID found in IDL metadata');
      }
    } catch (error) {
      console.log('[getAmmProgram] Could not extract program ID from IDL:', error);
    }

    // Use the manually configured program ID (from env) as the source of truth
    const programId = AMM_PROGRAM_ID;
    console.log('[getAmmProgram] Using program ID for initialization:', programId.toString());

    // Create minimal IDL with address field for Anchor v0.31+ compatibility
    // Remove option types completely from the IDL
    const processIDL = (idl: any) => {
      console.log('[getAmmProgram] Processing IDL to remove option types...');
      return JSON.parse(JSON.stringify(idl), (key, value) => {
        // If the value is an object with 'option' key, replace with the base type
        if (value && typeof value === 'object' && 'option' in value && !Array.isArray(value)) {
          console.log('[getAmmProgram] Replacing option type:', value);
          return 'publicKey';
        }
        return value;
      });
    };

    const cleanedIDL = processIDL(IDL);
    console.log('[getAmmProgram] IDL processing complete');

    // Log cleaned IDL structure (first 500 chars)
    const idlPreview = JSON.stringify(cleanedIDL, null, 2).substring(0, 500);
    console.log('[getAmmProgram] Cleaned IDL preview:', idlPreview);

    // CRITICAL: Create program with correct constructor signature
    // new Program(idl, programId, provider)
    // programId MUST be a valid PublicKey object, never undefined
    console.log('[getAmmProgram] Creating Program instance...');
    console.log('[getAmmProgram] - IDL type:', typeof cleanedIDL);
    console.log('[getAmmProgram] - programId:', programId.toString());
    console.log('[getAmmProgram] - programId type:', typeof programId);
    console.log('[getAmmProgram] - provider type:', typeof provider);

    const program = new Program(cleanedIDL as any, programId, provider);

    console.log('[getAmmProgram] ✅ Program initialized successfully');
    console.log('[getAmmProgram] Program ID from instance:', program.programId.toString());

    return program;
  } catch (error) {
    console.error('[getAmmProgram] ❌ Failed to initialize Anchor program:', error);
    console.error('[getAmmProgram] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[getAmmProgram] Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('[getAmmProgram] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(
      `Failed to initialize Anchor program: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
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
