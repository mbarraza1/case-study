"use client";

import { useState } from "react";

const APPLIANCES = [
  { icon: "❄️", label: "Refrigerator" },
  { icon: "🍽️", label: "Dishwasher" },
];

const APPLIANCE_OPTIONS: Record<string, { icon: string; label: string; query: string }[]> = {
  Refrigerator: [
    { icon: "🔍", label: "Browse parts", query: "Show me popular refrigerator parts" },
    { icon: "🛠️", label: "Troubleshoot a problem", query: "My refrigerator is " },
    { icon: "🏷️", label: "Search by model number", query: "What parts fit my model " },
    { icon: "❄️", label: "Ice maker issues", query: "My ice maker is not working" },
    { icon: "💧", label: "Leaking", query: "My refrigerator is leaking" },
    { icon: "🌡️", label: "Temperature problems", query: "My refrigerator is not cooling properly" },
  ],
  Dishwasher: [
    { icon: "🔍", label: "Browse parts", query: "Show me popular dishwasher parts" },
    { icon: "🛠️", label: "Troubleshoot a problem", query: "My dishwasher is " },
    { icon: "🏷️", label: "Search by model number", query: "What parts fit my model " },
    { icon: "🚿", label: "Won't drain", query: "My dishwasher won't drain" },
    { icon: "🔊", label: "Making noise", query: "My dishwasher is making a loud noise" },
    { icon: "💧", label: "Leaking", query: "My dishwasher is leaking" },
  ],
};

const EXAMPLES = [
  "How can I install part PS11752778?",
  "Is PS11752778 compatible with my WDT780SAEM1?",
  "What parts do you have for my GNE27JYMWFFS?",
];

interface Props {
  onSend: (text: string) => void;
  onPrefill: (text: string) => void;
}

export default function StarterScreen({ onSend, onPrefill }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="pl-10 pt-1 pb-3">
      {!selected ? (
        <>
          {/* Appliance selection */}
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-ps-muted/70 mb-2">What appliance do you need help with?</span>
            <div className="flex gap-2">
              {APPLIANCES.map((a) => (
                <button
                  key={a.label}
                  className="flex items-center gap-2.5 bg-white border border-ps-border/60 rounded-xl px-5 py-3.5 cursor-pointer hover:border-ps-teal/40 hover:shadow-sm transition-all"
                  onClick={() => setSelected(a.label)}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <span className="text-[14px] font-medium text-ps-text">{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div className="mt-5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-ps-muted/70 mb-2">Or try an example</span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((e) => (
                <button key={e} className="bg-white border border-ps-border/60 text-ps-text rounded-full px-3 py-1.5 text-[12px] text-left cursor-pointer hover:border-ps-teal/40 hover:bg-ps-teal-light/30 transition-all" onClick={() => onSend(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Back button + selected appliance options */}
          <div>
            <button
              className="text-[12px] text-ps-muted hover:text-ps-teal mb-2 cursor-pointer bg-transparent border-none p-0 flex items-center gap-1 transition-colors"
              onClick={() => setSelected(null)}
            >
              ← Back
            </button>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-ps-muted/70 mb-2">
              {selected} — how can I help?
            </span>
            <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
              {APPLIANCE_OPTIONS[selected].map((opt, i) => (
                <button
                  key={opt.label}
                  className="flex items-center gap-2.5 text-left bg-white border border-ps-border/60 rounded-xl px-3.5 py-3 cursor-pointer hover:border-ps-teal/40 hover:shadow-sm transition-all animate-[fade-up_0.2s_ease_both]"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => {
                    if (opt.query.endsWith(" ")) {
                      onPrefill(opt.query);
                    } else {
                      onSend(opt.query);
                    }
                  }}
                >
                  <span className="flex-none w-8 h-8 rounded-lg grid place-items-center text-sm bg-ps-teal-light">
                    {opt.icon}
                  </span>
                  <span className="text-[13px] font-medium text-ps-text">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
