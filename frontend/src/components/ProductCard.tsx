"use client";

import { useState } from "react";
import { Part } from "@/lib/types";
import { addToCart } from "@/lib/api";
import Thumbnail from "./Thumbnail";

const resolveImg = (url: string) => url;

interface ProductCardProps {
  part: Part;
  onCartUpdate?: (data: { items: Part[] }) => void;
}

export default function ProductCard({ part, onCartUpdate }: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const price = part.price != null ? `$${Number(part.price).toFixed(2)}` : "—";

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

  return (
    <div className="flex gap-3 bg-white border border-ps-border/60 rounded-xl p-3 hover:border-ps-border hover:shadow-sm transition-all">
      {/* Image */}
      <div className="flex-none">
        {part.imageUrl && !imgError ? (
          part.url ? (
            <a href={part.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
              <img className="w-14 h-14 rounded-lg object-contain bg-ps-bg" src={resolveImg(part.imageUrl)} alt={part.name} loading="lazy" onError={() => setImgError(true)} />
            </a>
          ) : (
            <img className="w-14 h-14 rounded-lg object-contain bg-ps-bg" src={resolveImg(part.imageUrl)} alt={part.name} loading="lazy" onError={() => setImgError(true)} />
          )
        ) : (
          <Thumbnail part={part} size={56} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-tight text-ps-text">
          {part.url ? (
            <a href={part.url} target="_blank" rel="noopener noreferrer" className="hover:text-ps-teal transition-colors no-underline">{part.name}</a>
          ) : part.name}
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-ps-muted">
          <span className="font-medium text-ps-teal">{part.partNumber}</span>
          {part.brand && <><span className="text-ps-border">·</span><span>{part.brand}</span></>}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {part.rating && (
            part.url ? (
              <a href={`${part.url}#CustomerReview`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ps-muted no-underline hover:text-ps-teal transition-colors">
                <span className="text-amber-400">★</span> {part.rating}{part.reviewCount ? ` (${part.reviewCount})` : ""}
              </a>
            ) : (
              <span className="text-[11px] text-ps-muted">
                <span className="text-amber-400">★</span> {part.rating}{part.reviewCount ? ` (${part.reviewCount})` : ""}
              </span>
            )
          )}
          {part.difficulty && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              part.difficulty.includes("Easy") ? "bg-emerald-50 text-emerald-700" :
              part.difficulty === "Moderate" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>{part.difficulty}</span>
          )}
          {part.hasVideo && (
            <a href={part.installVideoUrl || part.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 no-underline hover:bg-blue-100 transition-colors">
              ▶ Video
            </a>
          )}
        </div>
      </div>

      {/* Price + Action */}
      <div className="flex-none flex flex-col items-end justify-between">
        <div>
          <div className="text-[15px] font-semibold text-ps-text">{price}</div>
          <div className={`text-[10px] font-medium text-right ${part.inStock ? "text-emerald-600" : "text-red-500"}`}>
            {part.inStock ? "In stock" : "Out of stock"}
          </div>
        </div>
        {part.inStock ? (
          <button
            className={`mt-2 text-[11px] font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all ${
              added ? "bg-emerald-600 text-white" : "bg-ps-teal-light text-ps-teal hover:bg-ps-teal hover:text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={handleAddToCart}
            disabled={adding}
          >
            {added ? "Added ✓" : adding ? "Adding…" : "Add to Cart"}
          </button>
        ) : part.url ? (
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="mt-2 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-ps-bg text-ps-muted no-underline hover:bg-ps-border transition-colors">
            View
          </a>
        ) : null}
      </div>
    </div>
  );
}
