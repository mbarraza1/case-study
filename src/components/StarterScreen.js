import React from "react";

// Guided entry points shown before the first user message.
// "Action" tiles pre-fill the input with a template and focus it (teaching the
// user how to ask); appliance + example chips send a ready-to-go query.

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

export default function StarterScreen({ onSend, onPrefill }) {
  return (
    <div className="ps-starter">
      <div className="ps-starter-grid">
        {ACTIONS.map((a, i) => (
          <button
            key={a.title}
            className="ps-action"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => onPrefill(a.prefill)}
          >
            <span className="ps-action-icon">{a.icon}</span>
            <span className="ps-action-text">
              <span className="ps-action-title">{a.title}</span>
              <span className="ps-action-sub">{a.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="ps-starter-section">
        <span className="ps-starter-label">Browse by appliance</span>
        <div className="ps-pillrow">
          {APPLIANCES.map((a) => (
            <button key={a.label} className="ps-pill ps-pill-appliance" onClick={() => onSend(a.q)}>
              <span className="ps-pill-icon">{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ps-starter-section">
        <span className="ps-starter-label">Or try an example</span>
        <div className="ps-pillrow ps-pillrow-wrap">
          {EXAMPLES.map((e) => (
            <button key={e} className="ps-pill" onClick={() => onSend(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
