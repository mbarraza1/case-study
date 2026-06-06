import React from "react";
import "./App.css";
import ChatWindow from "./components/ChatWindow";

function App() {
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
        </div>
      </header>
      <main className="ps-main">
        <ChatWindow />
      </main>
    </div>
  );
}

export default App;
