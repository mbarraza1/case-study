"use client";

const ACTIONS = [
  { icon: "🔍", title: "Find a part", sub: "By name or PS number", prefill: "I'm looking for " },
  { icon: "🏷️", title: "Search by model", sub: "Enter your model number", prefill: "What parts fit my model " },
  { icon: "🔧", title: "Installation help", sub: "Step-by-step guidance", prefill: "How do I install part " },
  { icon: "🛠️", title: "Troubleshoot", sub: "Fix a problem", prefill: "My refrigerator is " },
];

const EXAMPLES = [
  "How can I install part PS11752778?",
  "What parts do you have for my GNE27JYMWFFS?",
  "The ice maker on my GE fridge isn't working",
];

interface Props {
  onSend: (text: string) => void;
  onPrefill: (text: string) => void;
}

export default function StarterScreen({ onSend, onPrefill }: Props) {
  return (
    <div className="pl-10 pt-1 pb-3">
      {/* Action tiles */}
      <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
        {ACTIONS.map((a, i) => (
          <button
            key={a.title}
            className="flex items-center gap-3 text-left bg-white border border-ps-border/60 rounded-xl px-3.5 py-3 cursor-pointer hover:border-ps-teal/40 hover:shadow-sm transition-all animate-[fade-up_0.25s_ease_both]"
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => onPrefill(a.prefill)}
          >
            <span className="flex-none w-9 h-9 rounded-lg grid place-items-center text-base bg-ps-teal-light">
              {a.icon}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-ps-text">{a.title}</span>
              <span className="text-[11px] text-ps-muted mt-0.5">{a.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Appliance selection */}
      <div className="mt-4">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-ps-muted/70 mb-2">Browse by appliance</span>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 bg-white border border-ps-border/60 rounded-xl px-4 py-2.5 cursor-pointer hover:border-ps-teal/40 hover:shadow-sm transition-all"
            onClick={() => onSend("Show me popular refrigerator parts")}
          >
            <span className="text-lg">❄️</span>
            <span className="text-[13px] font-medium text-ps-text">Refrigerator</span>
          </button>
          <button
            className="flex items-center gap-2 bg-white border border-ps-border/60 rounded-xl px-4 py-2.5 cursor-pointer hover:border-ps-teal/40 hover:shadow-sm transition-all"
            onClick={() => onSend("Show me popular dishwasher parts")}
          >
            <span className="text-lg">🍽️</span>
            <span className="text-[13px] font-medium text-ps-text">Dishwasher</span>
          </button>
        </div>
      </div>

      {/* Examples */}
      <div className="mt-4">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-ps-muted/70 mb-2">Try an example</span>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button key={e} className="bg-white border border-ps-border/60 text-ps-text rounded-full px-3 py-1.5 text-[12px] text-left cursor-pointer hover:border-ps-teal/40 hover:bg-ps-teal-light/30 transition-all" onClick={() => onSend(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
