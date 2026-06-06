import React from "react";
import ProductCard from "./ProductCard";

// Renders a check_compatibility verdict as a colored banner + the part card.
export default function CompatibilityResult({ result }) {
  const { compatible, confidence, reason, part, partNumber, modelNumber } = result;

  let state = "unknown";
  let icon = "?";
  let label = "Couldn't confirm";
  if (compatible === true) {
    state = "yes";
    icon = "✓";
    label = "Compatible";
  } else if (compatible === false) {
    state = "no";
    icon = "✕";
    label = "Not compatible";
  }

  return (
    <div className={`ps-compat ps-compat-${state}`}>
      <div className="ps-compat-head">
        <span className="ps-compat-icon">{icon}</span>
        <div>
          <div className="ps-compat-label">
            {label}
            {confidence && confidence !== "unknown" && (
              <span className="ps-compat-conf"> · {confidence} confidence</span>
            )}
          </div>
          <div className="ps-compat-pair">
            <strong>{partNumber}</strong> ↔ model <strong>{modelNumber}</strong>
          </div>
        </div>
      </div>
      {reason && <div className="ps-compat-reason">{reason}</div>}
      {part && (
        <div className="ps-compat-card">
          <ProductCard part={part} />
        </div>
      )}
    </div>
  );
}
