import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import ChatWindow from "./components/ChatWindow";
import CartPanel from "./components/CartPanel";
import { fetchCart } from "./api/api";

function App() {
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const itemCount = cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

  useEffect(() => {
    fetchCart().then((data) => setCartItems(data.items || []));
  }, []);

  const handleCartUpdate = useCallback((data) => {
    setCartItems(data.items || []);
  }, []);

  const openCart = useCallback(() => setCartOpen(true), []);

  return (
    <div className="App">
      <header className="ps-header">
        <div className="ps-header-inner">
          <div className="ps-logo-wrap">
            <img
              src="/ps-logo-header.svg"
              alt="PartSelect"
              className="ps-logo-img"
            />
          </div>
          <div className="ps-header-divider" />
          <div className="ps-header-titles">
            <div className="ps-header-title">Parts Assistant</div>
            <div className="ps-header-sub">Refrigerator &amp; Dishwasher</div>
          </div>
          <button className="ps-cart-btn" onClick={openCart} aria-label="Open cart">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {itemCount > 0 && <span className="ps-cart-badge">{itemCount}</span>}
          </button>
        </div>
      </header>
      <main className="ps-main">
        <ChatWindow onCartUpdate={handleCartUpdate} onOpenCart={openCart} />
      </main>
      {cartOpen && (
        <CartPanel
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onUpdate={handleCartUpdate}
        />
      )}
    </div>
  );
}

export default App;
