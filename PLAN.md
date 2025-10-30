Ok, this is the plan, what do you think now?: Tradr DeFi Platform - FINAL LOCKED IMPLEMENTATION PLAN
8 weeks solo | Spot-only CLOB | EC2 Backend | Pyth Level-1 | 9-Decimals Only | Custom Landing Page
✅ All Decisions Locked
Decision	Choice
Decimals	9-decimals only (Option C) - SOL compatible
LP Decimals	9 (matches base tokens)
Backend	AWS EC2 t3.medium + Docker Compose
Oracle	Pyth Level-1 (off-chain display + guards)
Auth	Wallet-only (no NextAuth)
Scope	AMM + Swaps + Spot CLOB (no leverage)
Landing Page	Custom animated WebGL particle system
Candles	1m, 5m, 15m only
WebSocket	250-500ms throttling
Cost	~$30-35/month
Phase 1: Foundation & Smart Contracts (Weeks 1-2)
Week 1, Day 1-3: Project Setup with Custom Landing Page
Initialize Next.js Project
npx create-next-app@latest tradr --typescript --tailwind --app
cd tradr
Install All Dependencies
# Solana/Web3
npm install @solana/web3.js@latest @solana/spl-token @coral-xyz/anchor@0.31.1
npm install @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
npm install @pyth-network/client

# State Management
npm install zustand @tanstack/react-query

# UI Components (shadcn/ui + landing page deps)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label
npm install @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-tabs
npm install @radix-ui/react-tooltip @radix-ui/react-select
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install sonner # Toast notifications

# Landing Page - WebGL Particle System
npm install @react-three/fiber @react-three/drei three
npm install leva maath r3f-perf
npm install @types/three -D

# Charts (for trading page)
npm install lightweight-charts

# Database
npm install prisma @prisma/client
npm install -D @types/node

# Fonts
npm install next/font geist
Project Structure Setup
tradr/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with wallet adapter
│   │   ├── page.tsx                  # Landing page (from provided code)
│   │   ├── globals.css               # Global styles (from provided code)
│   │   ├── create-token/
│   │   │   └── page.tsx
│   │   ├── create-pool/
│   │   │   └── page.tsx
│   │   ├── swap/
│   │   │   └── page.tsx
│   │   ├── trade/
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── tokens/route.ts
│   │       ├── pools/route.ts
│   │       └── markets/route.ts
│   ├── components/
│   │   ├── header.tsx               # Modified from provided code (add wallet button)
│   │   ├── hero.tsx                 # From provided code
│   │   ├── logo.tsx                 # From provided code
│   │   ├── mobile-menu.tsx          # From provided code
│   │   ├── pill.tsx                 # From provided code
│   │   ├── utils.ts                 # From provided code
│   │   ├── wallet/
│   │   │   ├── wallet-adapter.tsx   # NEW: Solana wallet integration
│   │   │   └── wallet-button.tsx
│   │   ├── gl/                      # From provided code (WebGL particle system)
│   │   │   ├── index.tsx
│   │   │   ├── particles.tsx
│   │   │   └── shaders/
│   │   │       ├── pointMaterial.ts
│   │   │       ├── simulationMaterial.ts
│   │   │       ├── utils.ts
│   │   │       └── vignetteShader.ts
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx           # From provided code
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   └── trading/                 # NEW: Trading components
│   │       ├── OrderBook.tsx
│   │       ├── TradingChart.tsx
│   │       └── OrderEntry.tsx
│   ├── lib/
│   │   ├── utils.ts                 # From provided code
│   │   ├── anchor/                  # NEW: Anchor integration
│   │   ├── solana/                  # NEW: Solana utilities
│   │   ├── pyth/                    # NEW: Pyth oracle
│   │   └── db.ts                    # NEW: Prisma client
│   ├── hooks/                       # NEW: Custom React hooks
│   └── store/                       # NEW: Zustand stores
├── public/
│   ├── Sentient-Extralight.woff     # From provided code
│   └── Sentient-LightItalic.woff    # From provided code
├── anchor/                           # NEW: Anchor programs
│   └── programs/amm-anchor/
├── backend/                          # NEW: Backend services (for EC2)
├── prisma/                           # NEW: Database schema
└── docker-compose.yml                # NEW: Backend deployment
Landing Page Integration (Week 1, Day 1) Copy all provided landing page files:
app/globals.css - Use provided CSS with custom fonts
app/layout.tsx - Modify to add wallet adapter:
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { WalletAdapter } from "@/components/wallet/wallet-adapter"; // NEW

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tradr - Decentralized Trading Platform",
  description: "Trade tokens on Solana with advanced AMM and CLOB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <WalletAdapter>
          <Header />
          {children}
        </WalletAdapter>
      </body>
    </html>
  );
}
app/page.tsx - Use provided hero page:
'use client'

import { Hero } from "@/components/hero";
import { Leva } from "leva";

export default function Home() {
  return (
    <>
      <Hero />
      <Leva hidden />
    </>
  );
}
components/hero.tsx - Modify CTA buttons:
"use client";

import Link from "next/link";
import { GL } from "./gl";
import { Pill } from "./pill";
import { Button } from "./ui/button";
import { useState } from "react";

export function Hero() {
  const [hovering, setHovering] = useState(false);
  return (
    <div className="flex flex-col h-svh justify-between">
      <GL hovering={hovering} />

      <div className="pb-16 mt-auto text-center relative">
        <Pill className="mb-6">DEVNET BETA</Pill>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sentient">
          Unlock your <br />
          <i className="font-light">DeFi</i> potential
        </h1>
        <p className="font-mono text-sm sm:text-base text-foreground/60 text-balance mt-8 max-w-[440px] mx-auto">
          Trade tokens on Solana with automated market making and order book trading
        </p>

        {/* Updated CTAs */}
        <div className="flex gap-4 justify-center mt-14">
          <Link className="contents max-sm:hidden" href="/create-token">
            <Button
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              [Create Token]
            </Button>
          </Link>
          <Link className="contents max-sm:hidden" href="/swap">
            <Button
              variant="secondary"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              [Start Trading]
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
components/header.tsx - Update navigation and add wallet button:
import Link from "next/link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { WalletButton } from "./wallet/wallet-button"; // NEW

export const Header = () => {
  return (
    <div className="fixed z-50 pt-8 md:pt-14 top-0 left-0 w-full">
      <header className="flex items-center justify-between container">
        <Link href="/">
          <Logo className="w-[100px] md:w-[120px]" />
        </Link>
        
        <nav className="flex max-lg:hidden absolute left-1/2 -translate-x-1/2 items-center justify-center gap-x-10">
          {[
            { name: "Create Token", href: "/create-token" },
            { name: "Create Pool", href: "/create-pool" },
            { name: "Swap", href: "/swap" },
            { name: "Trade", href: "/trade" },
          ].map((item) => (
            <Link
              className="uppercase inline-block font-mono text-foreground/60 hover:text-foreground/100 duration-150 transition-colors ease-out"
              href={item.href}
              key={item.name}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* Wallet Connect Button */}
        <WalletButton />
        
        <MobileMenu />
      </header>
    </div>
  );
};
Copy all WebGL components (components/gl/ directory from provided code)
Copy all UI components (components/ui/button.tsx, components/pill.tsx, etc.)
Copy font files to public/ directory
Update next.config.ts with provided config
Update tailwind.config.ts for custom theme
NEW: Wallet Adapter Component
// components/wallet/wallet-adapter.tsx
'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

export function WalletAdapter({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => 
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network), 
    [network]
  );

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
// components/wallet/wallet-button.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletButton() {
  return (
    <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/80 !font-mono !uppercase !h-10 !px-4" />
  );
}
Week 1, Day 4-7: AMM Program (9-Decimals, Events, Pyth-Ready)
(All AMM program changes as detailed in previous plan sections) Key changes:
Enforce 9 decimals in initialize_pool.rs
LP mint decimals = 9
Use precision = 9 in all curve operations
Add events (PoolInitialized, SwapExecuted, etc.)
Store decimals_x, decimals_y in Config
Default locked = true
Deploy to devnet:
cd anchor
anchor build
anchor deploy --provider.cluster devnet
Week 2: Database, Pyth Integration, Anchor Client
(As detailed in previous plan)
Prisma schema with Oracle table for Pyth feeds
Pyth client utilities (Level-1: off-chain)
Price deviation guards
Anchor TypeScript client wrappers
Phase 2: Backend Infrastructure - EC2 (Week 3)
(As detailed in previous plan)
EC2 t3.medium setup (ap-south-1)
Docker Compose: API + WebSocket + Indexer + Maker Bot
Caddy reverse proxy with auto TLS
Event-driven indexer (subscribes to program events)
Phase 3: Frontend Routes (Weeks 4-6)
Route Implementation Order
Week 4:
✅ Landing page (DONE - using provided code)
/create-token - Lock decimals to 9
/create-pool - Validate 9 decimals, SOL/token pairs
Week 5:
/swap - With Pyth reference price display
/admin - Pool approval, lock/unlock, fee updates
Week 6:
/trade - CLOB trading UI with order book, charts, order entry
(Detailed implementations as in previous plan)
Phase 4: Trading Features (Week 7)
OpenBook v1 integration
Real-time WebSocket hooks
Maker bot with Pyth deviation guard
Candle aggregation (1m/5m/15m)
Phase 5: Testing & Deployment (Week 8)
Testing Checklist
Landing Page
 WebGL particles render correctly
 Hero animation smooth on mobile
 Navigation works (all routes)
 Wallet connect button functional
 Responsive on all screen sizes
Core Functionality
 Create 9-decimal token
 Create SOL/token pool
 Admin approves pool
 Swap SOL → token (WSOL handling)
 Pyth price displayed correctly
 Deviation warning triggers
 OpenBook orders execute
 Maker bot quotes appear
 WebSocket updates work
Deployment
 Anchor program deployed to devnet
 Database migrations run
 EC2 backend services running
 Frontend deployed to Vercel
 DNS configured
 HTTPS working
Complete File Checklist
Landing Page Files (From Provided Code)
 app/globals.css - Custom fonts + theme
 app/layout.tsx - Modified with WalletAdapter
 app/page.tsx - Hero page
 components/header.tsx - Modified navigation + wallet button
 components/hero.tsx - Modified CTAs
 components/logo.tsx - Skal Ventures logo
 components/mobile-menu.tsx - Mobile navigation
 components/pill.tsx - Beta badge component
 components/utils.ts - Helper functions
 components/gl/index.tsx - WebGL canvas setup
 components/gl/particles.tsx - Particle system
 components/gl/shaders/pointMaterial.ts - Point shader
 components/gl/shaders/simulationMaterial.ts - Simulation shader
 components/gl/shaders/utils.ts - Shader utilities
 components/gl/shaders/vignetteShader.ts - Vignette effect
 components/ui/button.tsx - Custom button (from provided)
 lib/utils.ts - Tailwind merge utilities
 public/Sentient-Extralight.woff - Custom font
 public/Sentient-LightItalic.woff - Custom font italic
 next.config.ts - Next.js config (ignore build errors)
 components.json - shadcn/ui config
 tsconfig.json - TypeScript config
New Files to Create
 components/wallet/wallet-adapter.tsx - Solana wallet provider
 components/wallet/wallet-button.tsx - Connect wallet button
 app/create-token/page.tsx - Token creation form
 app/create-pool/page.tsx - Pool creation form
 app/swap/page.tsx - Token swap interface
 app/trade/page.tsx - Trading UI with CLOB
 app/admin/page.tsx - Admin dashboard
 All API routes, Anchor integration, backend services (as per plan)
MVP Definition of Done
✅ Landing Page
 Animated WebGL particle system
 Hero section with CTAs
 Navigation header with wallet button
 Responsive mobile menu
 Custom fonts and theme
✅ Core Features (unchanged from previous plan)
 Create SPL token (9 decimals)
 Create AMM pool (SOL/token, starts locked)
 Admin unlock pool
 Swap tokens (both directions)
 SOL ↔ Token swaps (WSOL handling)
 Pyth Level-1: Reference price + deviation guards
 CLOB trading with order book
 Real-time WebSocket updates
 Maker bot quoting
✅ Infrastructure
 EC2 backend (Docker Compose)
 Caddy reverse proxy
 Event-driven indexer
 Frontend on Vercel with custom landing page
Technology Stack Summary
Layer	Technology
Frontend	Next.js 15, TypeScript, Tailwind CSS, React Three Fiber
Landing	WebGL particles, custom shaders, Leva controls
Blockchain	Solana (devnet), Anchor, SPL Token, OpenBook v1
Oracle	Pyth Network (Level-1)
Backend	Express + Socket.io (EC2 Docker Compose)
Database	Neon Postgres + Prisma
Proxy	Caddy (auto TLS)
Deployment	Vercel (frontend), EC2 (backend)
Cost: ~$30-35/month
EC2 t3.medium: ~$30
Neon Postgres: $0 (free tier)
Vercel: $0 (hobby tier)
This plan is FINAL and includes the custom animated landing page. Ready to execute! 🚀 Say "GO" to start implementation!