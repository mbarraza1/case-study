"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import ChatWindow from "@/components/ChatWindow";
import CartPanel from "@/components/CartPanel";
import { fetchCart } from "@/lib/api";
import { Part } from "@/lib/types";

export default function Home() {
  const [cartItems, setCartItems] = useState<Part[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const itemCount = cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

  useEffect(() => {
    fetchCart().then((data) => setCartItems(data.items || []));
  }, []);

  const handleCartUpdate = useCallback((data: { items: Part[] }) => {
    setCartItems(data.items || []);
  }, []);

  const openCart = useCallback(() => setCartOpen(true), []);

  return (
    <>
      <Header cartCount={itemCount} onCartClick={openCart} />
      <main className="flex-1 min-h-0 flex justify-center">
        <ChatWindow onCartUpdate={handleCartUpdate} onOpenCart={openCart} />
      </main>
      {cartOpen && (
        <CartPanel
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onUpdate={handleCartUpdate}
        />
      )}
    </>
  );
}
