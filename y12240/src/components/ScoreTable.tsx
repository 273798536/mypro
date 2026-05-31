import type { GameScore } from "@/types/game";

const VERSION = "v1.0";

interface ScoreTableProps {
  score: GameScore;
  showVersion?: boolean;
}

export default function ScoreTable({ score, showVersion = true }: ScoreTableProps) {
  const rows = [
    {
      label: "频谱合成分",
      value: score.spectrumSynthesisScore,
      max: 40,
      source: "余弦相似度比对玩家/目标频谱",
      color: "#33ff99",
    },
    {
      label: "节奏判定分",
      value: score.rhythmJudgmentScore,
      max: 30,
      source: "节拍时间差判定（Perfect/Good/Miss）",
      color: "#33ccff",
    },
    {
      label: "波形回放分",
      value: score.waveformPlaybackScore,
      max: 30,
      source: "玩家/目标波形均方误差",
      color: "#3366ff",
    },
    {
      label: "频段混叠扣分",
      value: -score.aliasingDeduction,
      max: null,
      source: "重叠频段数 × 5",
      color: "#9966ff",
      isDeduction: true,
    },
    {
      label: "节拍错位扣分",
      value: -score.misalignmentDeduction,
      max: null,
      source: "连续错位拍数 × 3",
      color: "#ff9933",
      isDeduction: true,
    },
    {
      label: "过度滤波扣分",
      value: -score.overFilteringDeduction,
      max: null,
      source: "遗漏频段数 × 8",
      color: "#ff3366",
      isDeduction: true,
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1a1a3a]">
            <th className="text-left text-[#6688aa] py-2 font-normal text-xs">评分项</th>
            <th className="text-right text-[#6688aa] py-2 font-normal text-xs">得分</th>
            <th className="text-right text-[#6688aa] py-2 font-normal text-xs">满分</th>
            <th className="text-left text-[#6688aa] py-2 font-normal text-xs pl-4">来源算法</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[#0d0d20]">
              <td className="py-2">
                <span style={{ color: row.color }} className="font-medium">
                  {row.label}
                </span>
              </td>
              <td
                className={`text-right py-2 font-bold tabular-nums ${
                  row.isDeduction ? "text-red-400" : ""
                }`}
                style={!row.isDeduction ? { color: row.color } : undefined}
              >
                {row.isDeduction && row.value < 0 ? "" : ""}
                {row.value}
              </td>
              <td className="text-right py-2 text-[#445566]">
                {row.max !== null ? row.max : "-"}
              </td>
              <td className="py-2 text-[#445566] text-xs pl-4">
                {row.source}
                {showVersion && (
                  <span className="ml-1 text-[#334455]">· {VERSION}</span>
                )}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-[#33ff99]/30">
            <td className="py-3 text-white font-bold text-base">总分</td>
            <td className="py-3 text-right text-[#33ff99] font-bold text-xl tabular-nums">
              {score.totalScore}
            </td>
            <td className="py-3 text-right text-[#445566]">100</td>
            <td className="py-3 text-[#445566] text-xs pl-4">
              三项得分之和 − 三项扣分之和
              {showVersion && <span className="ml-1 text-[#334455]">· {VERSION}</span>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
