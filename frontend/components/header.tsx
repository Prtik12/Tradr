import Link from "next/link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { WalletButton } from "./wallet/wallet-button";

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
        <div className="max-lg:hidden">
          <WalletButton />
        </div>

        <MobileMenu />
      </header>
    </div>
  );
};
