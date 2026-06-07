"use client";

const ACTIONS = [
  { icon: "🔍", title: "Find a part", sub: "By name or PS number", prefill: "I'm looking for " },
  { icon: "🏷️", title: "Search by model", sub: "Enter your model number", prefill: "What parts fit my model " },
  { icon: "🔧", title: "Installation help", sub: "Step-by-step guidance", prefill: "How do I install part " },
  { icon: "🛠️", title: "Troubleshoot", sub: "Fix a problem", prefill: "My refrigerator is " },
];

const APPLIANCES = [
  { icon: "❄️", label: "Refrigerator", q: "Show me popular refrigerator parts" },
  { icon: "🍽️", label: "Dishwasher", q: "Show me popular dishwasher parts" },
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
    <div className="pl-[41px] pt-1 pb-2.5">
      <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
        {ACTIONS.map((a, i) => (
          <button
            key={a.title}
            className="flex items-center gap-3 text-left bg-ps-surface border border-ps-border rounded-xl px-3.5 py-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-ps-teal hover:shadow-lg animate-[fade-up_0.3s_ease_both]"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => onPrefill(a.prefill)}
          >
            <span className="flex-none w-[38px] h-[38px] rounded-[10px] grid place-items-center text-lg bg-[#eef5f4]">
              {a.icon}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-ps-text">{a.title}</span>
              <span className="text-xs text-ps-muted mt-0.5">{a.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-ps-muted mb-2">Browse by appliance</span>
        <div className="flex gap-2">
          {APPLIANCES.map((a) => (
            <button key={a.label} className="inline-flex items-center gap-1.5 bg-ps-surface border border-ps-border text-ps-teal-dark rounded-full px-3.5 py-2 text-[13px] font-semibold cursor-pointer hover:border-ps-teal hover:bg-[#f4faf9] transition-all" onClick={() => onSend(a.q)}>
              <span className="text-sm">{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <span className="block text-[11px] font-bold uppercase tracking-wider text-ps-muted mb-2">Or try an example</span>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} className="bg-ps-surface border border-ps-border text-ps-teal-dark rounded-full px-3.5 py-2 text-[13px] text-left cursor-pointer hover:border-ps-teal hover:bg-[#f4faf9] transition-all" onClick={() => onSend(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
