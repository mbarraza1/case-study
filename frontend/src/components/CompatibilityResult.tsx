import { CompatibilityResultData } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function CompatibilityResult({ result }: { result: CompatibilityResultData }) {
  const { compatible, confidence, reason, part, partNumber, modelNumber } = result;

  let icon = "?";
  let label = "Couldn't confirm";
  let colors = "bg-amber-50 border-amber-200";
  let iconBg = "bg-amber-500";

  if (compatible === true) {
    icon = "✓";
    label = "Compatible";
    colors = "bg-emerald-50 border-emerald-200";
    iconBg = "bg-emerald-500";
  } else if (compatible === false) {
    icon = "✕";
    label = "Not compatible";
    colors = "bg-red-50 border-red-200";
    iconBg = "bg-red-500";
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${colors}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`w-7 h-7 rounded-full grid place-items-center text-white text-xs font-bold flex-none ${iconBg}`}>
          {icon}
        </span>
        <div>
          <div className="text-sm font-medium text-ps-text">
            {label}
            {confidence && confidence !== "unknown" && (
              <span className="text-ps-muted font-normal text-xs ml-1.5">· {confidence} confidence</span>
            )}
          </div>
          <div className="text-[11px] text-ps-muted mt-0.5">
            {partNumber ? (
              <><span className="font-medium">{partNumber}</span> ↔ model <span className="font-medium">{modelNumber}</span></>
            ) : (
              <>Model <span className="font-medium">{modelNumber}</span></>
            )}
          </div>
        </div>
      </div>
      {reason && <div className="px-4 py-2.5 text-[13px] leading-relaxed text-ps-text/80 border-t border-inherit bg-white/50">{reason}</div>}
      {part && partNumber && (
        <div className="px-3 pb-3 pt-1 bg-white/30">
          <ProductCard part={part} />
        </div>
      )}
    </div>
  );
}
