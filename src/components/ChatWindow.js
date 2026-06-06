import React, { useState, useEffect, useRef } from "react";
import "./ChatWindow.css";
import { marked } from "marked";
import { streamChat } from "../api/api";
import ProductCard from "./ProductCard";
import CompatibilityResult from "./CompatibilityResult";
import InstallGuide from "./InstallGuide";

const WELCOME = {
  role: "assistant",
  content:
    "Hi! I'm the **PartSelect Assistant**. I can help you find **refrigerator** and " +
    "**dishwasher** parts, check if a part fits your model, walk you through installation, " +
    "or troubleshoot a problem.\n\nWhat can I help you with today?",
  blocks: [],
  status: null,
};

const SUGGESTIONS = [
  "How can I install part number PS11752778?",
  "Is PS11752778 compatible with my WDT780SAEM1 model?",
  "The ice maker on my Whirlpool fridge is not working. How can I fix it?",
];

function Blocks({ blocks }) {
  if (!blocks || !blocks.length) return null;
  return (
    <div className="ps-blocks">
      {blocks.map((b, i) => {
        if (b.type === "products") {
          return (
            <div key={i} className="ps-product-list">
              {b.items.map((p) => (
                <ProductCard key={p.partNumber} part={p} />
              ))}
            </div>
          );
        }
        if (b.type === "compatibility") {
          return <CompatibilityResult key={i} result={b.result} />;
        }
        if (b.type === "install_guide") {
          return <InstallGuide key={i} guide={b.guide} />;
        }
        return null;
      })}
    </div>
  );
}

function ChatWindow() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Immutably patch the last (assistant) message.
  const patchLast = (patch) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      patch(last);
      next[next.length - 1] = last;
      return next;
    });
  };

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isStreaming) return;

    const userMsg = { role: "user", content: trimmed, blocks: [] };
    // History sent to the backend = prior turns + this user message (text only).
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: "assistant", content: "", blocks: [], status: null },
    ]);
    setInput("");
    setIsStreaming(true);

    await streamChat(history, {
      onText: (delta) => patchLast((m) => (m.content += delta)),
      onToolStart: (evt) => patchLast((m) => (m.status = evt.label)),
      onCard: (evt) =>
        patchLast((m) => {
          m.blocks = [...m.blocks, evt];
          m.status = null;
        }),
      onError: (msg) =>
        patchLast((m) => {
          m.error = true;
          m.status = null;
          m.content = m.content || `⚠️ ${msg}`;
        }),
      onDone: () => {
        patchLast((m) => (m.status = null));
        setIsStreaming(false);
      },
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showSuggestions = messages.length === 1;

  return (
    <div className="ps-chat">
      <div className="ps-messages">
        {messages.map((m, i) => (
          <div key={i} className={`ps-row ps-row-${m.role}`}>
            <div className={`ps-bubble ps-bubble-${m.role} ${m.error ? "ps-bubble-error" : ""}`}>
              {m.content && (
                <div
                  className="ps-md"
                  dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }}
                />
              )}
              {m.status && (
                <div className="ps-status">
                  <span className="ps-status-dots"><span /><span /><span /></span>
                  {m.status}
                </div>
              )}
              <Blocks blocks={m.blocks} />
            </div>
          </div>
        ))}

        {showSuggestions && (
          <div className="ps-suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="ps-chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="ps-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about a refrigerator or dishwasher part…"
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="ps-send"
          onClick={() => send()}
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;
