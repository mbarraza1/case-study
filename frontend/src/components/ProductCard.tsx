"use client";

import { useState } from "react";
import { Part } from "@/lib/types";
import { addToCart } from "@/lib/api";
import Thumbnail from "./Thumbnail";

// Images are served from Next.js public/parts/ — paths like /parts/PS123.jpg work directly.
const resolveImg = (url: string) => url;

const DIFF_COLORS: Record<string, string> = {
  "Very Easy": "bg-green-100 text-green-800",
  "Really Easy": "bg-green-100 text-green-800",
  "Easy": "bg-green-100 text-green-800",
  "Moderate": "bg-amber-100 text-amber-800",
  "A Bit Difficult": "bg-red-100 text-red-700",
  "Difficult": "bg-red-100 text-red-700",
};

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="text-ps-yellow tracking-wider" title={`${rating} / 5`}>
      {"★★★★★".slice(0, full)}
      <span className="text-gray-300">{"★★★★★".slice(full)}</span>
    </span>
  );
}

interface ProductCardProps {
  part: Part;
  onCartUpdate?: (data: { items: Part[] }) => void;
}

export default function ProductCard({ part, onCartUpdate }: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const price = part.price != null ? `$${Number(part.price).toFixed(2)}` : "Price n/a";
  const diffClass = DIFF_COLORS[part.difficulty || ""] || "bg-amber-100 text-amber-800";

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await addToCart(part.partNumber);
    setAdding(false);
    if (result) {
      setAdded(true);
      onCartUpdate?.(result);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const reviewUrl = part.url ? `${part.url}#CustomerReview` : null;
  const installUrl = part.url ? `${part.url}#Instructions` : null;
  const videoUrl = part.installVideoUrl || installUrl;

  return (
    <div className="flex gap-3 items-center bg-ps-surface border border-ps-border rounded-xl p-3 animate-[fade-up_0.28s_ease_both]">
      {/* Image */}
      {part.imageUrl && !imgError ? (
        part.url ? (
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="flex-none rounded-lg hover:opacity-85 transition-opacity">
            <img className="w-16 h-16 rounded-lg object-contain bg-white border border-ps-border" src={resolveImg(part.imageUrl)} alt={part.name} loading="lazy" onError={() => setImgError(true)} />
          </a>
        ) : (
          <img className="w-16 h-16 rounded-lg object-contain bg-white border border-ps-border flex-none" src={resolveImg(part.imageUrl)} alt={part.name} loading="lazy" onError={() => setImgError(true)} />
        )
      ) : (
        <Thumbnail part={part} />
      )}

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm leading-tight">
          {part.url ? (
            <a href={part.url} target="_blank" rel="noopener noreferrer" className="hover:text-ps-teal hover:underline">{part.name}</a>
          ) : part.name}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs mt-1">
          <span className="font-semibold text-ps-teal">{part.partNumber}</span>
          {part.brand && <><span className="text-ps-border">•</span><span>{part.brand}</span></>}
          {part.partType && <><span className="text-ps-border">•</span><span className="text-ps-muted">{part.partType}</span></>}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {part.rating && (
            reviewUrl ? (
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:brightness-90 no-underline">
                <Stars rating={part.rating} />
                {part.reviewCount ? ` ${part.reviewCount} reviews` : ""}
              </a>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                <Stars rating={part.rating} />
                {part.reviewCount ? ` ${part.reviewCount}` : ""}
              </span>
            )
          )}
          {part.difficulty && (
            installUrl ? (
              <a href={installUrl} target="_blank" rel="noopener noreferrer" className={`text-[11px] px-2 py-0.5 rounded-full font-medium no-underline hover:brightness-90 ${diffClass}`}>
                {part.difficulty} install
              </a>
            ) : (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${diffClass}`}>{part.difficulty} install</span>
            )
          )}
          {part.hasVideo && videoUrl && (
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium no-underline hover:brightness-90">
              ▶ Video
            </a>
          )}
        </div>
      </div>

      {/* Right: price + button */}
      <div className="flex-none flex flex-col items-end gap-1 min-w-[92px]">
        <div className="font-extrabold text-base text-ps-teal-dark">{price}</div>
        <div className={`text-[11px] font-semibold ${part.inStock ? "text-green-700" : "text-red-700"}`}>
          {part.inStock ? "In stock" : "Out of stock"}
        </div>
        {part.inStock ? (
          <button
            className={`mt-1 text-xs font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all ${
              added ? "bg-green-700 text-white" : "bg-ps-teal text-white hover:bg-ps-teal-dark active:scale-95"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            onClick={handleAddToCart}
            disabled={adding}
          >
            {added ? "Added ✓" : adding ? "Adding…" : "Add to Cart"}
          </button>
        ) : part.url ? (
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="mt-1 bg-ps-yellow text-[#3a2c00] text-xs font-bold px-3 py-1.5 rounded-lg no-underline hover:brightness-95">
            View part
          </a>
        ) : null}
      </div>
    </div>
  );
}
