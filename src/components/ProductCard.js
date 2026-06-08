import React, { useState } from "react";
import Thumbnail from "./Thumbnail";
import { API_BASE, addToCart } from "../api/api";

const resolveImg = (url) =>
  url && url.startsWith("/") ? `${API_BASE}${url}` : url;

const EXT = { target: "_blank", rel: "noopener noreferrer" };

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

function PartImage({ part }) {
  const [failed, setFailed] = useState(false);
  const img =
    part.imageUrl && !failed ? (
      <img
        className="ps-thumb-img"
        src={resolveImg(part.imageUrl)}
        alt={part.name || part.partNumber}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    ) : (
      <Thumbnail part={part} />
    );

  return part.url ? (
    <a className="ps-thumb-link" href={part.url} {...EXT} aria-label={`View ${part.name}`}>
      {img}
    </a>
  ) : (
    img
  );
}

export default function ProductCard({ part, onCartUpdate }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const price =
    part.price != null ? `$${Number(part.price).toFixed(2)}` : "Price n/a";
  const diffClass = DIFFICULTY_CLASS[part.difficulty] || "moderate";

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await addToCart(part.partNumber);
    setAdding(false);
    if (result) {
      setAdded(true);
      if (onCartUpdate) onCartUpdate(result);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  // PartSelect anchor links for reviews and install instructions
  const reviewUrl  = part.url ? `${part.url}#CustomerReview` : null;
  const installUrl = part.url ? `${part.url}#Instructions`  : null;
  // Video: prefer the YouTube URL, fall back to the instructions anchor
  const videoUrl   = part.installVideoUrl || installUrl;

  return (
    <div className="ps-card">
      <PartImage part={part} />

      <div className="ps-card-body">
        <div className="ps-card-title">
          {part.url ? (
            <a className="ps-card-title-link" href={part.url} {...EXT}>
              {part.name}
            </a>
          ) : (
            part.name
          )}
        </div>

        <div className="ps-card-meta">
          <span className="ps-pn">{part.partNumber}</span>
          {part.brand    && <span className="ps-dot">•</span>}
          {part.brand    && <span>{part.brand}</span>}
          {part.partType && <span className="ps-dot">•</span>}
          {part.partType && <span className="ps-muted">{part.partType}</span>}
        </div>

        <div className="ps-card-tags">
          {part.rating ? (
            reviewUrl ? (
              <a className="ps-tag ps-tag-plain ps-tag-link" href={reviewUrl} {...EXT}
                 title={`${part.rating} out of 5`}>
                <Stars rating={part.rating} />
                {part.reviewCount ? ` ${part.reviewCount} reviews` : ""}
              </a>
            ) : (
              <span className="ps-tag ps-tag-plain" title={`${part.rating} out of 5`}>
                <Stars rating={part.rating} />
                {part.reviewCount ? ` ${part.reviewCount}` : ""}
              </span>
            )
          ) : null}

          {part.difficulty && (
            installUrl ? (
              <a className={`ps-tag ps-tag-${diffClass} ps-tag-link`} href={installUrl} {...EXT}>
                {part.difficulty} install
              </a>
            ) : (
              <span className={`ps-tag ps-tag-${diffClass}`}>{part.difficulty} install</span>
            )
          )}

          {part.hasVideo && videoUrl && (
            <a className="ps-tag ps-tag-video ps-tag-link" href={videoUrl} {...EXT}>
              ▶ Video
            </a>
          )}
        </div>
      </div>

      <div className="ps-card-right">
        <div className="ps-price">{price}</div>
        <div className={`ps-stock ${part.inStock ? "in" : "out"}`}>
          {part.inStock ? "In stock" : "Out of stock"}
        </div>
        {part.inStock ? (
          <button
            className={`ps-add-cart-btn ${added ? "ps-added" : ""}`}
            onClick={handleAddToCart}
            disabled={adding}
          >
            {added ? "Added ✓" : adding ? "Adding…" : "Add to Cart"}
          </button>
        ) : part.url ? (
          <a className="ps-view-btn" href={part.url} {...EXT}>
            View part
          </a>
        ) : null}
      </div>
    </div>
  );
}
