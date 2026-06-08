"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { marked } from "marked";
import { streamChat } from "@/lib/api";
import { Message, Block, Part, ImageAttachment } from "@/lib/types";
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
    <div className="mt-3 flex flex-col gap-2.5">
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
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userScrolledUp = useRef(false);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setAttachments((prev) => [...prev, { data: base64, mediaType: file.type, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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
    if ((!trimmed && attachments.length === 0) || isStreaming) return;

    userScrolledUp.current = false;
    const currentImages = attachments.length > 0 ? [...attachments] : undefined;
    const userMsg: Message = { role: "user", content: trimmed, images: currentImages, blocks: [], status: null };
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
      images: m.images,
    }));

    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "", blocks: [], status: "Thinking…" }]);
    setInput("");
    setAttachments([]);
    setIsStreaming(true);

    await streamChat(history, {
      onText: (delta) => patchLast((m) => { m.content += delta; m.status = null; }),
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
    <div className="w-full max-w-[860px] flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 flex flex-col gap-5" ref={containerRef} onScroll={onScroll}>
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 items-start ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex-none w-7 h-7 rounded-lg bg-ps-teal text-white text-[10px] font-bold grid place-items-center mt-0.5 shadow-sm">
                PS
              </div>
            )}
            <div className={`max-w-[80%] ${
              m.role === "user"
                ? "bg-ps-teal text-white rounded-2xl rounded-br-md px-4 py-2.5"
                : `bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-ps-border/50 ${m.error ? "bg-red-50 border-red-200" : ""}`
            } animate-[fade-up_0.2s_ease_both]`}>
              {/* Attached images */}
              {m.images && m.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {m.images.map((img, idx) => (
                    <img key={idx} src={`data:${img.mediaType};base64,${img.data}`} alt={img.name} className="w-14 h-14 rounded-lg object-cover border border-white/20" />
                  ))}
                </div>
              )}
              {/* Text content */}
              {m.content && (
                <div className="text-[14px] leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-1.5 [&_ul]:pl-5 [&_a]:text-ps-teal [&_a]:underline" dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }} />
              )}
              {/* Loading status */}
              {m.status && (
                <div className="flex items-center gap-2 mt-1.5 text-[13px] text-ps-muted">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((n) => (
                      <span key={n} className="w-1.5 h-1.5 rounded-full bg-ps-teal/60 animate-[bounce-dot_1.2s_infinite]" style={{ animationDelay: `${n * 0.15}s` }} />
                    ))}
                  </span>
                  <span>{m.status}</span>
                </div>
              )}
              <Blocks blocks={m.blocks} onCartUpdate={onCartUpdate} />
            </div>
          </div>
        ))}
        {showStarter && <StarterScreen onSend={send} onPrefill={prefill} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className={`px-4 pt-3 pb-4 bg-white/80 backdrop-blur-sm border-t border-ps-border/40 ${isDragging ? "ring-2 ring-ps-teal/30 ring-inset" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
      >
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2.5">
            {attachments.map((img, idx) => (
              <div key={idx} className="relative group">
                <img src={`data:${img.mediaType};base64,${img.data}`} alt={img.name} className="w-12 h-12 rounded-lg object-cover border border-ps-border" />
                <button
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  onClick={() => removeAttachment(idx)}
                  aria-label={`Remove ${img.name}`}
                >✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="max-w-[860px] mx-auto flex items-end gap-2 bg-white border border-ps-border rounded-2xl px-3 py-2 shadow-sm focus-within:border-ps-teal/50 focus-within:shadow-[0_0_0_3px_rgba(42,124,126,0.08)] transition-all">
          <button
            className="flex-none w-8 h-8 rounded-lg text-ps-muted hover:text-ps-teal hover:bg-ps-teal-light grid place-items-center transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            aria-label="Attach image"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={attachments.length > 0 ? "Add a message..." : "Ask about a refrigerator or dishwasher part…"}
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none border-none outline-none bg-transparent py-1.5 text-[14px] leading-snug max-h-[120px] text-ps-text placeholder:text-ps-muted/60"
          />
          <button
            className="flex-none w-8 h-8 rounded-lg bg-ps-teal text-white grid place-items-center cursor-pointer hover:bg-ps-teal-dark active:scale-95 disabled:bg-ps-border disabled:text-ps-muted disabled:cursor-not-allowed transition-all"
            onClick={() => send()}
            disabled={isStreaming || (!input.trim() && attachments.length === 0)}
            aria-label="Send"
          >
            {isStreaming ? (
              <span className="flex gap-0.5">
                {[0, 1, 2].map((n) => (
                  <span key={n} className="w-1 h-1 rounded-full bg-white animate-[bounce-dot_1.2s_infinite]" style={{ animationDelay: `${n * 0.15}s` }} />
                ))}
              </span>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            )}
          </button>
        </div>
        {isDragging && (
          <div className="text-center text-xs text-ps-teal font-medium mt-2">Drop image here</div>
        )}
      </div>
    </div>
  );
}
