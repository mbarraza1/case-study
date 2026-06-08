import { InstallGuideData } from "@/lib/types";

function ytId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([\w-]+)/) || url.match(/youtu\.be\/([\w-]+)/);
  return m ? m[1] : null;
}

export default function InstallGuide({ guide }: { guide: InstallGuideData }) {
  const vid = ytId(guide.videoUrl);

  return (
    <div className="border border-ps-border/60 rounded-xl bg-white p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-lg">🔧</span>
        <div>
          <div className="text-sm font-medium text-ps-text">Installation — {guide.name}</div>
          <div className="text-[11px] text-ps-teal font-medium">{guide.partNumber}</div>
        </div>
      </div>

      <div className="flex gap-6 mt-3">
        {guide.difficulty && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ps-muted mb-1">Difficulty</div>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
              guide.difficulty.includes("Easy") ? "bg-emerald-50 text-emerald-700" :
              guide.difficulty === "Moderate" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>{guide.difficulty}</span>
          </div>
        )}
        {guide.installTime && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ps-muted mb-1">Est. time</div>
            <span className="text-[13px] font-medium text-ps-text">{guide.installTime}</span>
          </div>
        )}
      </div>

      {vid && (
        <a className="block relative rounded-lg overflow-hidden mt-3 group" href={guide.videoUrl} target="_blank" rel="noopener noreferrer">
          <img className="w-full block rounded-lg" src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="Installation video" />
          <span className="absolute inset-0 grid place-items-center bg-black/25 group-hover:bg-black/35 transition-colors text-white font-medium text-sm">
            ▶ Watch video
          </span>
        </a>
      )}

      {guide.url && (
        <a className="inline-block mt-3 text-ps-teal text-[12px] font-medium no-underline hover:underline" href={guide.url} target="_blank" rel="noopener noreferrer">
          Full instructions on PartSelect →
        </a>
      )}
    </div>
  );
}
