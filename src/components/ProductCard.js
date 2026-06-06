import React, { useState } from "react";
import Thumbnail from "./Thumbnail";
import { API_BASE } from "../api/api";

// Backend-relative image paths (/static/parts/..) are served by the API host.
const resolveImg = (url) =>
  url && url.startsWith("/") ? `${API_BASE}${url}` : url;

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

// Real product photo when we have one; fall back to the generated tile if the
// part has no image or the image fails to load.
function PartImage({ part }) {
  const [failed, setFailed] = useState(false);
  if (part.imageUrl && !failed) {
    return (
      <img
        className="ps-thumb-img"
        src={resolveImg(part.imageUrl)}
        alt={part.name || part.partNumber}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return <Thumbnail part={part} />;
}

export default function ProductCard({ part }) {
  const price =
    part.price != null ? `$${Number(part.price).toFixed(2)}` : "Price n/a";
  const diffClass = DIFFICULTY_CLASS[part.difficulty] || "moderate";

  return (
    <div className="ps-card">
      <PartImage part={part} />
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
