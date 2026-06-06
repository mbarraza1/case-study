import React from "react";

const DIFFICULTY_CLASS = {
  "Very Easy": "easy",
  "Really Easy": "easy",
  Easy: "easy",
  Moderate: "moderate",
  "A Bit Difficult": "hard",
  Difficult: "hard",
};

// Converts a YouTube watch URL into an embeddable preview link/thumbnail.
function ytId(url) {
  if (!url) return null;
  const m = url.match(/[?&]v=([\w-]+)/) || url.match(/youtu\.be\/([\w-]+)/);
  return m ? m[1] : null;
}

export default function InstallGuide({ guide }) {
  const diffClass = DIFFICULTY_CLASS[guide.difficulty] || "moderate";
  const vid = ytId(guide.videoUrl);

  return (
    <div className="ps-guide">
      <div className="ps-guide-head">
        <span className="ps-guide-tool">🔧</span>
        <div>
          <div className="ps-guide-title">Installation — {guide.name}</div>
          <div className="ps-guide-pn">{guide.partNumber}</div>
        </div>
      </div>
      <div className="ps-guide-stats">
        {guide.difficulty && (
          <div className="ps-guide-stat">
            <span className="ps-guide-stat-label">Difficulty</span>
            <span className={`ps-tag ps-tag-${diffClass}`}>{guide.difficulty}</span>
          </div>
        )}
        {guide.installTime && (
          <div className="ps-guide-stat">
            <span className="ps-guide-stat-label">Est. time</span>
            <span className="ps-guide-stat-val">{guide.installTime}</span>
          </div>
        )}
      </div>
      {vid && (
        <a
          className="ps-guide-video"
          href={guide.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            className="ps-guide-thumb"
            src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`}
            alt="Installation video"
          />
          <span className="ps-guide-play">▶ Watch the installation video</span>
        </a>
      )}
      {guide.url && (
        <a
          className="ps-guide-link"
          href={guide.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Full instructions on PartSelect →
        </a>
      )}
    </div>
  );
}
