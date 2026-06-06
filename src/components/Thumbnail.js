import React from "react";

// Deterministic generated placeholder thumbnail (no external images).
// Picks a stable color from the part number and shows an appliance glyph.

const PALETTE = [
  "#337778", "#2f6f6f", "#3d6e8e", "#7a5d3a", "#6b6f3a",
  "#8a4f5a", "#4a5d8a", "#5a7a4f", "#7a4f7a", "#3a6b6b",
];

function colorFor(seed) {
  let h = 0;
  for (let i = 0; i < (seed || "").length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const FRIDGE = (
  <g fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
    <rect x="15" y="8" width="20" height="34" rx="3" />
    <line x1="15" y1="22" x2="35" y2="22" />
    <line x1="20" y1="13" x2="20" y2="18" />
    <line x1="20" y1="26" x2="20" y2="33" />
  </g>
);

const DISH = (
  <g fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
    <rect x="13" y="9" width="24" height="32" rx="3" />
    <line x1="13" y1="17" x2="37" y2="17" />
    <circle cx="25" cy="29" r="6" />
    <circle cx="25" cy="29" r="1.6" fill="white" />
  </g>
);

export default function Thumbnail({ part, size = 64 }) {
  const bg = colorFor(part.partNumber || part.name || "x");
  const glyph = (part.applianceType || "").toLowerCase().includes("dish") ? DISH : FRIDGE;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      className="ps-thumb"
      role="img"
      aria-label={part.name || "part"}
    >
      <rect width="50" height="50" rx="8" fill={bg} />
      <rect width="50" height="50" rx="8" fill="url(#shine)" />
      <defs>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {glyph}
    </svg>
  );
}
