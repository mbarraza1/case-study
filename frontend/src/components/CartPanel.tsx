"use client";

import { Part } from "@/lib/types";
import { removeFromCart } from "@/lib/api";

const resolveImg = (url: string) => url;

interface CartPanelProps {
  items: Part[];
  onClose: () => void;
  onUpdate: (data: { items: Part[] }) => void;
}

export default function CartPanel({ items, onClose, onUpdate }: CartPanelProps) {
  const total = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
  const itemCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const handleRemove = async (partNumber: string) => {
    const result = await removeFromCart(partNumber);
    if (result) onUpdate(result);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100] animate-[fade-in_0.15s_ease]" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-[360px] max-w-[88vw] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.08)] flex flex-col animate-[slide-in-right_0.2s_ease]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ps-border/60">
          <div>
            <h2 className="text-base font-semibold m-0 text-ps-text">Your Cart</h2>
            {itemCount > 0 && <p className="text-xs text-ps-muted m-0 mt-0.5">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>}
          </div>
          <button className="w-8 h-8 rounded-lg grid place-items-center text-ps-muted hover:bg-ps-bg hover:text-ps-text transition-colors" onClick={onClose} aria-label="Close cart">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ps-muted px-6">
            <div className="w-12 h-12 rounded-2xl bg-ps-bg grid place-items-center mb-3">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ps-muted/50"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <p className="text-sm font-medium text-ps-text m-0">Your cart is empty</p>
            <p className="text-xs mt-1 m-0">Add parts from the chat to get started</p>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <div key={item.partNumber} className="flex gap-3 px-5 py-3.5 border-b border-ps-border/40 last:border-b-0">
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-none bg-ps-bg grid place-items-center">
                    {item.imageUrl ? (
                      <img src={resolveImg(item.imageUrl)} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-base">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium leading-tight text-ps-text">{item.name}</div>
                    <div className="text-[11px] text-ps-muted mt-0.5">
                      <span className="text-ps-teal font-medium">{item.partNumber}</span>
                      {item.brand && ` · ${item.brand}`}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-ps-muted">Qty: {item.quantity || 1}</span>
                      <button className="text-[11px] text-red-500 hover:text-red-700 transition-colors cursor-pointer bg-transparent border-none p-0" onClick={() => handleRemove(item.partNumber)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex-none text-sm font-semibold text-ps-text">
                    ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-ps-border/60 px-5 py-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-ps-muted">Total</span>
                <span className="text-lg font-semibold text-ps-text">${total.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.filter((i) => i.url).length > 1 && (
                  <button
                    className="w-full text-center bg-ps-teal text-white text-sm font-medium px-4 py-2.5 rounded-xl border-none cursor-pointer hover:bg-ps-teal-dark transition-colors"
                    onClick={() => {
                      items.filter((i) => i.url).forEach((item) => window.open(item.url!, "_blank"));
                    }}
                  >
                    Buy all {items.filter((i) => i.url).length} items on PartSelect
                  </button>
                )}
                {items.filter((i) => i.url).map((item) => (
                  <a
                    key={item.partNumber}
                    href={item.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-ps-teal text-xs font-medium px-3 py-2 rounded-lg border border-ps-teal/20 no-underline hover:bg-ps-teal-light transition-colors"
                  >
                    Buy {item.partNumber} →
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
