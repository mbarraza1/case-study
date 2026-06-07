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
    <div className="fixed inset-0 bg-black/30 z-[100] animate-[fade-in_0.2s_ease]" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-[380px] max-w-[90vw] bg-ps-surface shadow-[-4px_0_20px_rgba(0,0,0,0.15)] flex flex-col animate-[slide-in-right_0.25s_ease]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ps-border">
          <h2 className="text-[17px] font-bold m-0">
            Your Cart {itemCount > 0 && <span className="font-medium text-ps-muted">({itemCount})</span>}
          </h2>
          <button className="bg-transparent border-none text-lg cursor-pointer text-ps-muted px-2 py-1 rounded-md hover:bg-gray-100" onClick={onClose} aria-label="Close cart">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ps-muted">
            <span className="text-[40px] mb-3">🛒</span>
            <p className="m-0">Your cart is empty</p>
            <p className="text-[13px] mt-1">Add parts from the chat to get started</p>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {items.map((item) => (
                <div key={item.partNumber} className="flex gap-2.5 py-3 border-b border-ps-border last:border-b-0">
                  <div className="w-[50px] h-[50px] rounded-lg overflow-hidden flex-none bg-gray-100 grid place-items-center">
                    {item.imageUrl ? (
                      <img src={resolveImg(item.imageUrl)} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold leading-tight">{item.name}</div>
                    <div className="text-[11px] text-ps-muted mt-0.5">
                      <span className="text-ps-teal font-semibold">{item.partNumber}</span>
                      {item.brand && ` · ${item.brand}`}
                    </div>
                    <div className="text-[11px] text-ps-muted mt-1">Qty: {item.quantity || 1}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="font-bold text-sm text-ps-teal-dark">
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                    <button className="bg-transparent border-none text-red-700 text-[11px] cursor-pointer p-0 hover:underline" onClick={() => handleRemove(item.partNumber)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-ps-border px-5 py-4">
              <div className="flex justify-between items-center text-[15px] font-semibold">
                <span>Total</span>
                <span className="text-lg text-ps-teal-dark">${total.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {items.filter((i) => i.url).length > 1 && (
                  <button
                    className="block w-full text-center bg-ps-teal text-white text-sm font-bold px-3 py-2.5 rounded-lg border-none cursor-pointer hover:bg-ps-teal-dark transition-all"
                    onClick={() => {
                      items.forEach((item) => {
                        if (item.url) window.open(item.url, "_blank");
                      });
                    }}
                  >
                    Open all {items.filter((i) => i.url).length} items on PartSelect
                  </button>
                )}
                {items.map((item) =>
                  item.url ? (
                    <a key={item.partNumber} href={item.url} target="_blank" rel="noopener noreferrer" className="block text-center bg-ps-yellow text-[#3a2c00] text-xs font-bold px-3 py-2 rounded-lg no-underline hover:brightness-95 transition-all">
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
