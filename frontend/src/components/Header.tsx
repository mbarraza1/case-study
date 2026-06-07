"use client";

import Image from "next/image";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export default function Header({ cartCount, onCartClick }: HeaderProps) {
  return (
    <header className="bg-gradient-to-b from-ps-teal to-ps-teal-dark text-white shadow-md z-10">
      <div className="max-w-[820px] mx-auto h-16 flex items-center gap-4 px-5">
        <div className="overflow-hidden h-[33px] flex-none">
          <Image
            src="/ps-logo-header.svg"
            alt="PartSelect"
            width={160}
            height={65}
            className="h-[65px] w-auto -mt-px"
            priority
          />
        </div>
        <div className="w-px h-[30px] bg-white/25" />
        <div>
          <div className="text-[15px] font-semibold">Parts Assistant</div>
          <div className="text-xs text-white/70">Refrigerator &amp; Dishwasher</div>
        </div>
        <button
          className="ml-auto relative p-2 rounded-full hover:bg-white/15 transition-colors"
          onClick={onCartClick}
          aria-label="Open cart"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {cartCount > 0 && (
            <span className="absolute top-0.5 right-0.5 bg-ps-yellow text-[#3a2c00] text-[10px] font-extrabold min-w-4 h-4 rounded-full grid place-items-center leading-none">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
