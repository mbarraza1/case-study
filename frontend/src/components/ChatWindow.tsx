"use client";

import { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { streamChat } from "@/lib/api";
import { Message, Block, Part } from "@/lib/types";
import ProductCard from "./ProductCard";
import CompatibilityResult from "./CompatibilityResult";
import InstallGuide from "./InstallGuide";
import StarterScreen from "./StarterScreen";

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm the **PartSelect Assistant** 👋\n\nI can help you find **refrigerator** and " +
    "**dishwasher** parts, check if a part fits your model, walk you through installation, " +
    "or troubleshoot a problem. Pick a starting point below — or just ask.",
  blocks: [],
  status: null,
};

function Blocks({ blocks, onCartUpdate }: { blocks: Block[]; onCartUpdate?: (data: { items: Part[] }) => void }) {
  if (!blocks.length) return null;
  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      {blocks.map((b, i) => {
        if (b.type === "products") {
          return (
            <div key={i} className="flex flex-col gap-2">
              {b.items.map((p) => <ProductCard key={p.partNumber} part={p} onCartUpdate={onCartUpdate} />)}
            </div>
          );
        }
        if (b.type === "compatibility") return <CompatibilityResult key={i} result={b.result} />;
        if (b.type === "install_guide") return <InstallGuide key={i} guide={b.guide} />;
        return null;
      })}
    </div>
  );
}

interface Props {
  onCartUpdate?: (data: { items: Part[] }) => void;
  onOpenCart?: () => void;
}

export default function ChatWindow({ onCartUpdate, onOpenCart }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    if (!userScrolledUp.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
  };

  const patchLast = (patch: (m: Message) => void) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      patch(last);
      next[next.length - 1] = last;
      return next;
    });
  };

  const prefill = (text: string) => {
    setInput(text);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(text.length, text.length); }
    });
  };

  const send = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isStreaming) return;

    userScrolledUp.current = false;
    const userMsg: Message = { role: "user", content: trimmed, blocks: [], status: null };
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", blocks: [], status: null }]);
    setInput("");
    setIsStreaming(true);

    await streamChat(history, {
      onText: (delta) => patchLast((m) => { m.content += delta; }),
      onToolStart: (evt) => patchLast((m) => { m.status = evt.label; }),
      onCard: (evt) => {
        const e = evt as Record<string, unknown>;
        if (e.type === "cart_update" && onCartUpdate) {
          onCartUpdate({ items: (e.cart as { items: Part[] })?.items || [] });
        } else if (e.type === "cart" && onOpenCart) {
          onCartUpdate?.({ items: (e.items as Part[]) || [] });
          onOpenCart();
        }
        patchLast((m) => { m.blocks = [...m.blocks, e as Block]; m.status = null; });
      },
      onError: (msg) => patchLast((m) => { m.error = true; m.status = null; m.content = m.content || `⚠️ ${msg}`; }),
      onDone: () => { patchLast((m) => { m.status = null; }); setIsStreaming(false); },
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const showStarter = messages.length === 1;

  return (
    <div className="w-full max-w-[820px] flex flex-col min-h-0 bg-ps-bg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-2 flex flex-col gap-3.5" ref={containerRef} onScroll={onScroll}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 items-start ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex-none w-8 h-8 rounded-full bg-gradient-to-br from-ps-teal to-ps-teal-dark text-white text-[11px] font-extrabold grid place-items-center shadow-md mt-0.5">
                PS
              </div>
            )}
            <div className={`max-w-[86%] px-4 py-3 rounded-[14px] text-[14.5px] leading-relaxed shadow-sm animate-[fade-up_0.28s_ease_both] ${
              m.role === "user"
                ? "bg-ps-teal text-white rounded-br-sm"
                : `bg-ps-surface border border-ps-border rounded-bl-sm max-w-[92%] ${m.error ? "bg-red-50 border-red-200" : ""}`
            }`}>
              {m.content && (
                <div className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_ul]:my-1.5 [&_ul]:pl-5 [&_a]:text-ps-teal" dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }} />
              )}
              {m.status && (
                <div className="inline-flex items-center gap-2 mt-2 text-[13px] text-ps-muted">
                  <span className="inline-flex gap-[3px]">
                    {[0, 1, 2].map((n) => (
                      <span key={n} className="w-1.5 h-1.5 rounded-full bg-ps-teal opacity-40 animate-[bounce-dot_1.2s_infinite]" style={{ animationDelay: `${n * 0.15}s` }} />
                    ))}
                  </span>
                  {m.status}
                </div>
              )}
              <Blocks blocks={m.blocks} onCartUpdate={onCartUpdate} />
            </div>
          </div>
        ))}
        {showStarter && <StarterScreen onSend={send} onPrefill={prefill} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pt-3 pb-3.5 bg-ps-bg border-t border-ps-border">
        <div className="flex items-end gap-2 bg-ps-surface border border-ps-border rounded-3xl px-4 py-1.5 focus-within:border-ps-teal focus-within:shadow-[0_0_0_4px_rgba(51,119,120,0.1)] transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about a refrigerator or dishwasher part…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none border-none outline-none bg-transparent py-2.5 text-[14.5px] leading-snug max-h-[140px] text-ps-text placeholder:text-ps-muted"
          />
          <button
            className="flex-none w-10 h-10 rounded-full bg-ps-teal text-white border-none grid place-items-center cursor-pointer hover:bg-ps-teal-dark active:scale-[0.92] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            onClick={() => send()}
            disabled={isStreaming || !input.trim()}
            aria-label="Send"
          >
            {isStreaming ? (
              <span className="inline-flex gap-[3px]">
                {[0, 1, 2].map((n) => (
                  <span key={n} className="w-[5px] h-[5px] rounded-full bg-white animate-[bounce-dot_1.2s_infinite]" style={{ animationDelay: `${n * 0.15}s` }} />
                ))}
              </span>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="6 11 12 5 18 11" />
              </svg>
            )}
          </button>
        </div>
        <div className="text-center text-[11px] text-ps-muted mt-2">PartSelect Assistant · Refrigerator &amp; Dishwasher parts</div>
      </div>
    </div>
  );
}
