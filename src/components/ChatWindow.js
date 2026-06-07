import React, { useState, useEffect, useRef } from "react";
import "./ChatWindow.css";
import { marked } from "marked";
import { streamChat } from "../api/api";
import ProductCard from "./ProductCard";
import CompatibilityResult from "./CompatibilityResult";
import InstallGuide from "./InstallGuide";
import StarterScreen from "./StarterScreen";

const WELCOME = {
  role: "assistant",
  content:
    "Hi! I'm the **PartSelect Assistant** 👋\n\nI can help you find **refrigerator** and " +
    "**dishwasher** parts, check if a part fits your model, walk you through installation, " +
    "or troubleshoot a problem. Pick a starting point below — or just ask.",
  blocks: [],
  status: null,
};

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
  const textareaRef = useRef(null);

  const messagesContainerRef = useRef(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const onScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // "Near bottom" = within 100px of the bottom edge
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    userScrolledUp.current = !atBottom;
  };

  const patchLast = (patch) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      patch(last);
      next[next.length - 1] = last;
      return next;
    });
  };

  // Pre-fill the composer with a template and focus it (used by starter tiles).
  const prefill = (text) => {
    setInput(text);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(text.length, text.length);
      }
    });
  };

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isStreaming) return;

    userScrolledUp.current = false;
    const userMsg = { role: "user", content: trimmed, blocks: [] };
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

  const showStarter = messages.length === 1;

  return (
    <div className="ps-chat">
      <div className="ps-messages" ref={messagesContainerRef} onScroll={onScroll}>
        {messages.map((m, i) => (
          <div key={i} className={`ps-row ps-row-${m.role}`}>
            {m.role === "assistant" && <div className="ps-avatar" aria-hidden>PS</div>}
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

        {showStarter && <StarterScreen onSend={send} onPrefill={prefill} />}

        <div ref={messagesEndRef} />
      </div>

      <div className="ps-input-area">
        <div className="ps-input-wrap">
          <textarea
            ref={textareaRef}
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
            aria-label="Send"
          >
            {isStreaming ? (
              <span className="ps-send-dots"><span /><span /><span /></span>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="6 11 12 5 18 11" />
              </svg>
            )}
          </button>
        </div>
        <div className="ps-input-hint">PartSelect Assistant • Refrigerator &amp; Dishwasher parts</div>
      </div>
    </div>
  );
}

export default ChatWindow;
