import { InstallGuideData } from "@/lib/types";

const DIFF_COLORS: Record<string, string> = {
  "Very Easy": "bg-green-100 text-green-800",
  "Really Easy": "bg-green-100 text-green-800",
  "Easy": "bg-green-100 text-green-800",
  "Moderate": "bg-amber-100 text-amber-800",
  "A Bit Difficult": "bg-red-100 text-red-700",
  "Difficult": "bg-red-100 text-red-700",
};

function ytId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([\w-]+)/) || url.match(/youtu\.be\/([\w-]+)/);
  return m ? m[1] : null;
}

export default function InstallGuide({ guide }: { guide: InstallGuideData }) {
  const diffClass = DIFF_COLORS[guide.difficulty || ""] || "bg-amber-100 text-amber-800";
  const vid = ytId(guide.videoUrl);

  return (
    <div className="border border-ps-border rounded-xl bg-ps-surface p-3">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">🔧</span>
        <div>
          <div className="font-semibold text-sm">Installation — {guide.name}</div>
          <div className="text-xs text-ps-teal font-semibold">{guide.partNumber}</div>
        </div>
      </div>
      <div className="flex gap-5 mt-3">
        {guide.difficulty && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-ps-muted">Difficulty</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${diffClass}`}>{guide.difficulty}</span>
          </div>
        )}
        {guide.installTime && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-ps-muted">Est. time</span>
            <span className="font-semibold text-[13.5px]">{guide.installTime}</span>
          </div>
        )}
      </div>
      {vid && (
        <a className="block relative rounded-lg overflow-hidden mt-3 no-underline" href={guide.videoUrl} target="_blank" rel="noopener noreferrer">
          <img className="w-full block rounded-lg" src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="Installation video" />
          <span className="absolute inset-0 grid place-items-center bg-black/30 text-white font-bold text-sm">▶ Watch the installation video</span>
        </a>
      )}
      {guide.url && (
        <a className="inline-block mt-2.5 text-ps-teal font-semibold text-[13px] no-underline hover:underline" href={guide.url} target="_blank" rel="noopener noreferrer">
          Full instructions on PartSelect →
        </a>
      )}
    </div>
  );
}
