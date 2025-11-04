import { PublicKey } from '@solana/web3.js';

/**
 * Hardcoded admin wallet addresses
 * These wallets have permission to approve/reject pool requests
 */
export const ADMIN_ADDRESSES: string[] = [
  // Add your admin wallet addresses here
  // Example:
  // '7icgfyD9LFq82w7PHckedCVWSkBwc5nabHbaTCgMe4Vv',
  // 'AnotherAdminWalletAddress...',
];

/**
 * Check if a wallet address is an admin
 */
export function isAdmin(walletAddress: string | null | undefined): boolean {
  if (!walletAddress) return false;
  return ADMIN_ADDRESSES.includes(walletAddress);
}

/**
 * Check if a PublicKey is an admin
 */
export function isAdminPubkey(pubkey: PublicKey | null | undefined): boolean {
  if (!pubkey) return false;
  return isAdmin(pubkey.toString());
}

/**
 * Get admin display name (if available)
 */
export function getAdminName(walletAddress: string): string | null {
  const adminIndex = ADMIN_ADDRESSES.indexOf(walletAddress);
  if (adminIndex === -1) return null;

  // You can customize admin names here
  const adminNames: { [key: string]: string } = {
    // Example:
    // '7icgfyD9LFq82w7PHckedCVWSkBwc5nabHbaTCgMe4Vv': 'Admin 1',
  };

  return adminNames[walletAddress] || `Admin ${adminIndex + 1}`;
}

/**
 * Validate if there are any admins configured
 */
export function hasAdmins(): boolean {
  return ADMIN_ADDRESSES.length > 0;
}

/**
 * Get all admin addresses as PublicKey array
 */
export function getAdminPublicKeys(): PublicKey[] {
  return ADMIN_ADDRESSES.map((address) => new PublicKey(address));
}
