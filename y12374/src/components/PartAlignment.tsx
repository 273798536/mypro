import type { Track, AnalysisResult, Issue } from "@/types";
import { ISSUE_TYPE_LABELS } from "@/types";

interface PartAlignmentProps {
  tracks: Track[];
  analyses: AnalysisResult[];
}

const PART_COLORS: Record<string, string> = {
  "女高音": "#D4A843",
  "女低音": "#7C9EB2",
  "男高音": "#8B7355",
  "男低音": "#1B2A4A",
};

export default function PartAlignment({ tracks, analyses }: PartAlignmentProps) {
  const totalDuration = 60;

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-medium text-[#1B2A4A] mb-4">声部对齐视图</h3>
      <div className="space-y-3">
        {tracks.map((track) => {
          const analysis = analyses.find((a) => a.recordingId === track.recordingId);
          const partIssues = (analysis?.detectedIssues || []).filter(
            (i) => i.type === "part_misalignment" || i.partName === track.partName
          );
          const color = PART_COLORS[track.partName] || "#6b7280";

          return (
            <div key={track.id} className="flex items-center gap-3">
              <span className="w-16 text-xs text-zinc-600 text-right shrink-0">{track.partName}</span>
              <div className="flex-1 relative h-8">
                <div className="absolute inset-0 rounded-md" style={{ backgroundColor: color, opacity: 0.15 }} />
                <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: "100%", backgroundColor: color, opacity: 0.3 }} />
                {partIssues.map((iss) => (
                  <div
                    key={iss.id}
                    className="absolute top-0 bottom-0 w-0.5 bg-[#C44E52] z-10"
                    style={{ left: `${(iss.startTime / totalDuration) * 100}%` }}
                    title={`${ISSUE_TYPE_LABELS[iss.type]} @ ${iss.startTime.toFixed(1)}s`}
                  >
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#C44E52]" />
                  </div>
                ))}
                {[0, 15, 30, 45, 60].map((t) => (
                  <span
                    key={t}
                    className="absolute top-full text-[9px] text-zinc-400 mt-0.5"
                    style={{ left: `${(t / totalDuration) * 100}%`, transform: "translateX(-50%)" }}
                  >
                    {t}s
                  </span>
                ))}
              </div>
              <span className="w-8 text-xs text-zinc-400 shrink-0">
                {partIssues.length > 0 && (
                  <span className="text-[#C44E52]">{partIssues.length}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
