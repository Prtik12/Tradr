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
          <Link className="contents max-sm:hidden" href="/trade">
            <Button
              variant="secondary"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              [Start Trading]
            </Button>
          </Link>
        </div>

        {/* Mobile buttons */}
        <div className="flex flex-col gap-3 sm:hidden mt-14 items-center">
          <Link href="/create-token">
            <Button
              size="sm"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              [Create Token]
            </Button>
          </Link>
          <Link href="/swap">
            <Button
              size="sm"
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
