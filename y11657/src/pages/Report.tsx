import { useGameStore } from '@/store/gameStore';
import { exportCSV, exportJSON, minutesToLabel } from '@/utils/importExport';
import { Link } from 'react-router-dom';
import { FileJson, FileSpreadsheet, FileWarning, ChevronRight } from 'lucide-react';

export default function ReportPage() {
  const { lastSim, lastResult, materials } = useGameStore();

  if (!lastSim) {
    return (
      <div className="card p-10 text-center">
        <div className="text-white/70 mb-3">还没有运行报告。先完成一次排程模拟。</div>
        <Link to="/scheduler" className="btn-primary inline-flex">
          去排程竞技 <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  const opReportRows = lastSim.opReports.map((r) => ({
    时间: minutesToLabel(r.timestamp),
    冷库区: materials.zones.find((z) => z.id === r.zoneId)?.name ?? r.zoneId,
    温度: r.temperature.toFixed(2),
    事件类型: r.eventType,
  }));

  const alertRows = lastSim.alerts.map((a, i) => ({
    序号: i + 1,
    时间: minutesToLabel(a.time),
    类型: a.type,
    描述: a.message,
  }));

  const scoreRows =
    lastResult?.events.map((e, i) => ({
      序号: i + 1,
      类型: e.type,
      分值: e.value,
      详情: e.detail,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-wider">运行报告</h1>
          <p className="text-white/60 text-sm mt-1">导出本次排程的运行数据、告警与评分明细。</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost flex items-center gap-2"
            onClick={() => exportCSV(opReportRows, `运行报告_温度-${Date.now()}.csv`)}
          >
            <FileSpreadsheet size={14} /> 温度 CSV
          </button>
          <button
            className="btn-ghost flex items-center gap-2"
            onClick={() => exportCSV(alertRows, `运行报告_告警-${Date.now()}.csv`)}
          >
            <FileWarning size={14} /> 告警 CSV
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() =>
              exportJSON(
                {
                  materials,
                  opReports: lastSim.opReports,
                  alerts: lastSim.alerts,
                  score: lastResult,
                },
                `运行报告_${Date.now()}.json`,
              )
            }
          >
            <FileJson size={14} /> 导出 JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SummaryCard label="总记录" value={lastSim.opReports.length} />
        <SummaryCard label="告警" value={lastSim.alerts.length} tone="red" />
        <SummaryCard label="温度采样点" value={lastSim.temperatureSeries.length} />
        <SummaryCard label="总得分" value={lastResult?.score ?? 0} tone="blue" />
      </div>

      <div className="card p-5">
        <div className="font-display mb-3">温度运行数据</div>
        <ReportTable headers={['时间', '冷库区', '温度', '事件类型']} rows={opReportRows.slice(0, 50)} total={opReportRows.length} />
      </div>

      <div className="card p-5">
        <div className="font-display mb-3">告警明细</div>
        <ReportTable headers={['序号', '时间', '类型', '描述']} rows={alertRows.slice(0, 50)} total={alertRows.length} />
      </div>

      <div className="card p-5">
        <div className="font-display mb-3">评分明细</div>
        <ReportTable headers={['序号', '类型', '分值', '详情']} rows={scoreRows} total={scoreRows.length} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'red' | 'blue' }) {
  return (
    <div className={`card p-4 col-span-3 ${tone === 'red' ? 'bg-red-500/10 border-red-500/30' : tone === 'blue' ? 'bg-[#2E5BFF]/10 border-[#2E5BFF]/30' : ''}`}>
      <div className="text-xs text-white/60">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}

function ReportTable({ headers, rows, total }: { headers: string[]; rows: Record<string, any>[]; total: number }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/50 border-b border-white/10">
              {headers.map((h) => (
                <th key={h} className="text-left py-2 pr-4 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/5">
                {headers.map((h) => (
                  <td key={h} className="py-2 pr-4 text-white/80">{r[h]}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-3 text-white/40">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {total > rows.length && <div className="text-xs text-white/40 mt-2">共 {total} 条，仅显示前 {rows.length} 条。</div>}
    </div>
  );
}
