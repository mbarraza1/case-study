"use client";

import Image from "next/image";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export default function Header({ cartCount, onCartClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-ps-border/60 z-10">
      <div className="max-w-[860px] mx-auto h-14 flex items-center gap-3 px-5">
        <div className="overflow-hidden h-[30px] flex-none">
          <Image
            src="/ps-logo-header.svg"
            alt="PartSelect"
            width={140}
            height={60}
            className="h-[60px] w-auto -mt-px"
            priority
          />
        </div>
        <div className="w-px h-6 bg-ps-border" />
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ps-text">Parts Assistant</span>
          <span className="text-xs text-ps-muted">Refrigerator &amp; Dishwasher</span>
        </div>
        <button
          className="ml-auto relative p-2.5 rounded-xl hover:bg-ps-teal-light transition-colors text-ps-muted hover:text-ps-teal"
          onClick={onCartClick}
          aria-label="Open cart"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          {cartCount > 0 && (
            <span className="absolute top-1 right-1 bg-ps-teal text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full grid place-items-center leading-none">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
