'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CreateTokenPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: '',
    imageUrl: '',
  });

  const [isCreating, setIsCreating] = useState(false);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.name || !formData.symbol || !formData.supply) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.supply) <= 0) {
      toast.error('Supply must be greater than 0');
      return;
    }

    setIsCreating(true);

    try {
      // Generate new mint keypair
      const mintKeypair = Keypair.generate();
      const decimals = 9; // Locked to 9 for SOL compatibility

      // Get rent-exempt balance for mint account
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      // Create account instruction
      const createAccountIx = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      });

      // Initialize mint instruction
      const initializeMintIx = createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        publicKey, // mint authority
        publicKey, // freeze authority
        TOKEN_PROGRAM_ID
      );

      // Create metadata account PDA
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Create metadata instruction
      const createMetadataIx = createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: mintKeypair.publicKey,
          mintAuthority: publicKey,
          payer: publicKey,
          updateAuthority: publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: formData.name,
              symbol: formData.symbol,
              uri: formData.imageUrl || '', // Can be empty or a JSON metadata URI
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      );

      // Build transaction
      const transaction = new Transaction().add(
        createAccountIx,
        initializeMintIx,
        createMetadataIx
      );

      // Mint initial supply to creator (now required)
      const supplyAmount = parseFloat(formData.supply) * Math.pow(10, decimals);

      // Get associated token account address
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );

      // Create associated token account instruction
      const createATAIx = createAssociatedTokenAccountInstruction(
        publicKey, // payer
        associatedTokenAddress, // ata
        publicKey, // owner
        mintKeypair.publicKey // mint
      );

      // Mint to instruction
      const mintToIx = createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        publicKey, // mint authority
        supplyAmount
      );

      transaction.add(createATAIx, mintToIx);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction with mint keypair
      transaction.partialSign(mintKeypair);

      // Sign with wallet
      const signedTx = await signTransaction(transaction);

      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // Show confirming toast
      toast.loading('Confirming transaction on Solana...', { id: 'confirming' });

      // Confirm transaction
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      // Dismiss confirming toast
      toast.dismiss('confirming');

      setMintAddress(mintKeypair.publicKey.toString());
      setTxSignature(signature);

      // Store token metadata in database
      try {
        await fetch('/api/tokens/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mintAddress: mintKeypair.publicKey.toString(),
            name: formData.name,
            symbol: formData.symbol,
            decimals,
            supply: formData.supply || '0',
            imageUrl: formData.imageUrl,
            creator: publicKey.toString(),
            signature,
          }),
        });
      } catch (dbError) {
        console.error('Failed to store token metadata:', dbError);
        // Don't fail the whole operation if DB storage fails
      }

      // Show success toast with token details
      toast.success(
        `Token "${formData.name}" (${formData.symbol}) created successfully!`,
        {
          description: `Mint: ${mintKeypair.publicKey.toString().substring(0, 8)}...`,
          duration: 5000,
        }
      );

      // Reset form
      setFormData({ name: '', symbol: '', supply: '', imageUrl: '' });

    } catch (error) {
      console.error('Error creating token:', error);
      toast.dismiss('confirming');
      toast.error(error instanceof Error ? error.message : 'Failed to create token');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="container max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Create Token</h1>
          <p className="text-white/60 text-lg">
            Create a new SPL token on Solana with 9 decimals (SOL compatible)
          </p>
        </div>

        {mintAddress ? (
          <div className="bg-black/30 border border-primary/30 p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-primary">Token Created Successfully!</h2>
              <p className="text-white/60">Your token has been created on Solana devnet</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-white/40 text-xs">Mint Address</Label>
                <div className="bg-black/50 border border-white/10 p-4 mt-2">
                  <code className="text-sm text-primary break-all">{mintAddress}</code>
                </div>
              </div>

              {txSignature && (
                <div>
                  <Label className="text-white/40 text-xs">Transaction Signature</Label>
                  <div className="bg-black/50 border border-white/10 p-4 mt-2">
                    <code className="text-xs text-white/60 break-all">{txSignature}</code>
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <div className="bg-primary/10 border border-primary/30 p-4">
                  <p className="text-sm text-white/80 mb-2">
                    <strong className="text-primary">Next Step:</strong> Create a liquidity pool for your token
                  </p>
                  <p className="text-xs text-white/60">
                    Set up an AMM pool to enable trading on the platform
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => window.open(`https://solscan.io/token/${mintAddress}?cluster=devnet`, '_blank')}
                  >
                    View on Solscan
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => window.open(`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`, '_blank')}
                  >
                    Solana Explorer
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setMintAddress(null);
                      setTxSignature(null);
                      setFormData({ name: '', symbol: '', supply: '', imageUrl: '' });
                    }}
                  >
                    Create Another Token
                  </Button>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => router.push(`/create-pool?mint=${mintAddress}`)}
                  >
                    Next: Create Pool →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateToken} className="space-y-6">
            <div className="bg-black/30 border border-white/10 p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Token Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., My Token"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  placeholder="e.g., MTK"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  required
                  disabled={isCreating}
                  maxLength={10}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="decimals">Decimals</Label>
                <Input
                  id="decimals"
                  value="9 (locked for SOL compatibility)"
                  disabled
                  className="bg-black/70 cursor-not-allowed"
                />
                <p className="text-xs text-white/40">
                  All tokens on Tradr use 9 decimals to match SOL's precision
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supply">Initial Supply *</Label>
                <Input
                  id="supply"
                  name="supply"
                  type="number"
                  placeholder="e.g., 1000000"
                  value={formData.supply}
                  onChange={handleInputChange}
                  required
                  disabled={isCreating}
                  min="1"
                  step="any"
                />
                <p className="text-xs text-white/40">
                  The total number of tokens to mint to your wallet
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  disabled={isCreating}
                />
                <p className="text-xs text-white/40">
                  Public URL to token logo image
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setFormData({ name: '', symbol: '', supply: '', imageUrl: '' })}
                disabled={isCreating}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="default"
                className="flex-1"
                disabled={isCreating || !publicKey}
              >
                {isCreating ? 'Creating Token...' : 'Create Token'}
              </Button>
            </div>

            {!publicKey && (
              <p className="text-center text-sm text-primary">
                Please connect your wallet to create a token
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
