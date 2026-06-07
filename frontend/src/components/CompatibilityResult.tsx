import { CompatibilityResultData } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function CompatibilityResult({ result }: { result: CompatibilityResultData }) {
  const { compatible, confidence, reason, part, partNumber, modelNumber } = result;

  let state = "unknown";
  let icon = "?";
  let label = "Couldn't confirm";
  let headBg = "bg-amber-50";
  let iconBg = "bg-amber-500";

  if (compatible === true) {
    state = "yes";
    icon = "✓";
    label = "Compatible";
    headBg = "bg-green-50";
    iconBg = "bg-green-600";
  } else if (compatible === false) {
    state = "no";
    icon = "✕";
    label = "Not compatible";
    headBg = "bg-red-50";
    iconBg = "bg-red-600";
  }

  return (
    <div className="border border-ps-border rounded-xl overflow-hidden bg-ps-surface">
      <div className={`flex items-center gap-3 p-3 ${headBg}`}>
        <span className={`w-[30px] h-[30px] rounded-full grid place-items-center text-white font-extrabold flex-none ${iconBg}`}>
          {icon}
        </span>
        <div>
          <div className="font-bold text-sm">
            {label}
            {confidence && confidence !== "unknown" && (
              <span className="font-medium text-ps-muted"> · {confidence} confidence</span>
            )}
          </div>
          <div className="text-xs text-ps-muted">
            {partNumber ? (
              <><strong>{partNumber}</strong> ↔ model <strong>{modelNumber}</strong></>
            ) : (
              <>Model <strong>{modelNumber}</strong></>
            )}
          </div>
        </div>
      </div>
      {reason && <div className="px-3.5 py-2.5 text-[13.5px] leading-relaxed border-t border-ps-border">{reason}</div>}
      {part && partNumber && (
        <div className="px-2.5 pb-2.5">
          <ProductCard part={part} />
        </div>
      )}
    </div>
  );
}
