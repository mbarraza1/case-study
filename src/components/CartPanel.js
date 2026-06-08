import React from "react";
import { API_BASE, removeFromCart } from "../api/api";

const resolveImg = (url) =>
  url && url.startsWith("/") ? `${API_BASE}${url}` : url;

const EXT = { target: "_blank", rel: "noopener noreferrer" };

export default function CartPanel({ items, onClose, onUpdate }) {
  const total = items.reduce(
    (sum, i) => sum + (i.price || 0) * (i.quantity || 1),
    0
  );
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const handleRemove = async (partNumber) => {
    const result = await removeFromCart(partNumber);
    if (result) onUpdate(result);
  };

  return (
    <div className="ps-cart-overlay" onClick={onClose}>
      <div className="ps-cart-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ps-cart-header">
          <h2 className="ps-cart-title">
            Your Cart {itemCount > 0 && <span className="ps-cart-count">({itemCount})</span>}
          </h2>
          <button className="ps-cart-close" onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="ps-cart-empty">
            <span className="ps-cart-empty-icon">🛒</span>
            <p>Your cart is empty</p>
            <p className="ps-cart-empty-sub">Add parts from the chat to get started</p>
          </div>
        ) : (
          <>
            <div className="ps-cart-items">
              {items.map((item) => (
                <div key={item.partNumber} className="ps-cart-item">
                  <div className="ps-cart-item-img">
                    {item.imageUrl ? (
                      <img
                        src={resolveImg(item.imageUrl)}
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="ps-cart-item-placeholder">📦</div>
                    )}
                  </div>
                  <div className="ps-cart-item-info">
                    <div className="ps-cart-item-name">{item.name}</div>
                    <div className="ps-cart-item-meta">
                      <span className="ps-cart-item-pn">{item.partNumber}</span>
                      {item.brand && <span> · {item.brand}</span>}
                    </div>
                    <div className="ps-cart-item-qty">Qty: {item.quantity || 1}</div>
                  </div>
                  <div className="ps-cart-item-right">
                    <div className="ps-cart-item-price">
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                    <button
                      className="ps-cart-item-remove"
                      onClick={() => handleRemove(item.partNumber)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="ps-cart-footer">
              <div className="ps-cart-total">
                <span>Total</span>
                <span className="ps-cart-total-price">${total.toFixed(2)}</span>
              </div>
              <div className="ps-cart-actions">
                {items.map((item) =>
                  item.url ? (
                    <a
                      key={item.partNumber}
                      className="ps-cart-buy-link"
                      href={item.url}
                      {...EXT}
                    >
                      Buy {item.partNumber} on PartSelect →
                    </a>
                  ) : null
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
