'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="bg-primary text-primary-foreground hover:bg-primary/80 font-mono uppercase h-10 px-4 rounded-md">
        Loading...
      </button>
    );
  }

  return (
    <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/80 !font-mono !uppercase !h-10 !px-4 !rounded-md" />
  );
}
