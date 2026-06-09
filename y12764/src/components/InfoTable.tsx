import type { LabRecord } from "@/types";

interface InfoTableProps {
  record: LabRecord;
  highlightAnomalies?: boolean;
}

interface RowDef {
  label: string;
  key: keyof LabRecord;
  isAnomaly?: boolean;
  format?: (v: unknown) => string;
}

export default function InfoTable({ record, highlightAnomalies = true }: InfoTableProps) {
  const rows: RowDef[] = [
    { label: "实验批号", key: "batchNo", isAnomaly: record.isDuplicate },
    { label: "实验日期", key: "date" },
    { label: "操作人员", key: "operator" },
    { label: "反应时间", key: "reactionTime", isAnomaly: !record.reactionTime, format: (v) => (v ? String(v) : "未记录") },
    { label: "展开剂比例", key: "solventRatio" },
    { label: "环境温度", key: "temperature" },
    { label: "相对湿度", key: "humidity" },
    { label: "薄层板类型", key: "plateType" },
    { label: "点样体积", key: "spotVolume" },
    { label: "展开距离", key: "developmentDistance" },
  ];

  return (
    <div className="overflow-hidden border border-slate-200 rounded bg-white">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, idx) => {
            const raw = record[row.key];
            const value = row.format ? row.format(raw) : String(raw ?? "—");
            const anomaly = highlightAnomalies && row.isAnomaly;
            return (
              <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="px-4 py-2.5 w-32 font-medium text-slate-600 border-r border-slate-100 font-serif">
                  {row.label}
                </td>
                <td
                  className={`px-4 py-2.5 ${
                    anomaly
                      ? "bg-red-50 text-red-700 font-medium animate-pulse-border"
                      : "text-lab-ink"
                  }`}
                >
                  {anomaly && <span className="mr-1.5">⚠</span>}
                  {value}
                  {row.key === "batchNo" && record.isDuplicate && (
                    <span className="ml-2 text-xs text-red-600">（与其他记录重复）</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
