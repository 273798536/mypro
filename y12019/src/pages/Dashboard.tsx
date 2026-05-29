import { useState, useMemo } from "react";
import { useAppStore } from "@/store";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend, ResponsiveContainer,
} from "recharts";
import { AlertTriangle, RotateCcw, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";

const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
const severityColor: Record<string, string> = { critical: "border-red-500", warning: "border-amber-500", info: "border-blue-500" };
const severityBadge: Record<string, string> = { critical: "bg-red-100 text-red-700", warning: "bg-amber-100 text-amber-700", info: "bg-blue-100 text-blue-700" };
const severityLabel: Record<string, string> = { critical: "严重", warning: "警告", info: "提示" };

export default function Dashboard() {
  const { accrualRecords, reversalRecords, exceptions, contracts, crossYearSettlements, currentPeriod } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalAccrual = useMemo(
    () => accrualRecords.filter((r) => r.period === currentPeriod).reduce((s, r) => s + r.amount, 0),
    [accrualRecords, currentPeriod],
  );
  const totalReversal = useMemo(() => reversalRecords.reduce((s, r) => s + r.amount, 0), [reversalRecords]);
  const pendingCount = useMemo(() => exceptions.filter((e) => e.status === "pending").length, [exceptions]);

  const trendData = useMemo(() => {
    const map = new Map<string, number>();
    accrualRecords.forEach((r) => map.set(r.period, (map.get(r.period) ?? 0) + r.amount));
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, amount }));
  }, [accrualRecords]);

  const pendingExceptions = useMemo(
    () => exceptions.filter((e) => e.status === "pending").sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    [exceptions],
  );

  const crossYearData = useMemo(() => {
    const crossContracts = contracts.filter((c) => c.isCrossYear);
    return crossContracts.map((c) => {
      const settlement = crossYearSettlements.find((s) => s.contractId === c.id);
      return {
        code: c.code,
        currentYearAmount: settlement?.currentYearAmount ?? 0,
        nextYearAmount: settlement?.nextYearAmount ?? 0,
        status: settlement?.status ?? "pending",
      };
    });
  }, [contracts, crossYearSettlements]);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: "当期预提总额", value: `¥${totalAccrual.toLocaleString()}`, icon: <ClipboardList className="h-5 w-5 text-amber-500" /> },
          { label: "已冲回金额", value: `¥${totalReversal.toLocaleString()}`, icon: <RotateCcw className="h-5 w-5 text-amber-500" /> },
          { label: "待处理异常", value: pendingCount, icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
        ].map((card) => (
          <div key={card.label} className="rounded-lg bg-white shadow border-t-4 border-amber-500 p-5">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{card.label}</span>
              {card.icon}
            </div>
            <div className="mt-2 font-mono text-2xl font-semibold text-gray-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white shadow p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">预提费用趋势</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
            <Line type="monotone" dataKey="amount" stroke="#64748b" dot={{ fill: "#f59e0b", r: 4 }} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg bg-white shadow p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">异常待办</h2>
        <div className="space-y-2">
          {pendingExceptions.map((ex) => (
            <div
              key={ex.id}
              className={`rounded border-l-4 ${severityColor[ex.severity]} bg-gray-50 p-3 cursor-pointer`}
              onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-800">{ex.description}</span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge[ex.severity]}`}>
                    {severityLabel[ex.severity]}
                  </span>
                  {expandedId === ex.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>
              {expandedId === ex.id && (
                <div className="mt-2 rounded bg-amber-50 p-2 text-sm text-gray-600">
                  💡 {ex.suggestion.description}
                </div>
              )}
            </div>
          ))}
          {pendingExceptions.length === 0 && <p className="text-sm text-gray-400">暂无待处理异常</p>}
        </div>
      </div>

      <div className="rounded-lg bg-white shadow p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">跨年合同快照</h2>
        {crossYearData.length > 0 ? (
          <ResponsiveContainer width="100%" height={crossYearData.length * 60 + 40}>
            <BarChart data={crossYearData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="code" type="category" width={120} />
              <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="currentYearAmount" name="本年金额" fill="#64748b" />
              <Bar dataKey="nextYearAmount" name="次年金额" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400">暂无跨年合同</p>
        )}
      </div>
    </div>
  );
}
