import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { WalletAdapter } from "@/components/wallet/wallet-adapter";
import { Toaster } from "sonner";

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
          <Toaster position="bottom-right" theme="dark" />
        </WalletAdapter>
      </body>
    </html>
  );
}
