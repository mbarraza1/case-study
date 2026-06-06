import React from "react";
import Thumbnail from "./Thumbnail";

function Stars({ rating }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return (
    <span className="ps-stars" title={`${rating} / 5`}>
      {"★★★★★".slice(0, full)}
      <span className="ps-stars-empty">{"★★★★★".slice(full)}</span>
    </span>
  );
}

const DIFFICULTY_CLASS = {
  "Very Easy": "easy",
  "Really Easy": "easy",
  Easy: "easy",
  Moderate: "moderate",
  "A Bit Difficult": "hard",
  Difficult: "hard",
};

export default function ProductCard({ part }) {
  const price =
    part.price != null ? `$${Number(part.price).toFixed(2)}` : "Price n/a";
  const diffClass = DIFFICULTY_CLASS[part.difficulty] || "moderate";

  return (
    <div className="ps-card">
      <Thumbnail part={part} />
      <div className="ps-card-body">
        <div className="ps-card-title">{part.name}</div>
        <div className="ps-card-meta">
          <span className="ps-pn">{part.partNumber}</span>
          {part.brand && <span className="ps-dot">•</span>}
          {part.brand && <span>{part.brand}</span>}
          {part.partType && <span className="ps-dot">•</span>}
          {part.partType && <span className="ps-muted">{part.partType}</span>}
        </div>
        <div className="ps-card-tags">
          {part.rating ? (
            <span className="ps-tag ps-tag-plain">
              <Stars rating={part.rating} />
              {part.reviewCount ? ` ${part.reviewCount}` : ""}
            </span>
          ) : null}
          {part.difficulty && (
            <span className={`ps-tag ps-tag-${diffClass}`}>{part.difficulty} install</span>
          )}
          {part.hasVideo && <span className="ps-tag ps-tag-video">▶ Video</span>}
        </div>
      </div>
      <div className="ps-card-right">
        <div className="ps-price">{price}</div>
        <div className={`ps-stock ${part.inStock ? "in" : "out"}`}>
          {part.inStock ? "In stock" : "Out of stock"}
        </div>
        {part.url && (
          <a
            className="ps-view-btn"
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View part
          </a>
        )}
      </div>
    </div>
  );
}
