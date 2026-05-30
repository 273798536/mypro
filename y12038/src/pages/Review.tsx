import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useGameStore, getLevelConfig } from "@/store/gameStore";
import {
  generateReport,
  exportAsCsv,
  exportAsJson,
  downloadFile,
} from "@/engine/reportGenerator";
import { calcSettlement } from "@/engine/calculator";

function pnlColor(value: number, dark = false) {
  if (value >= 0) return dark ? "text-green-400" : "text-green-600";
  return dark ? "text-red-400" : "text-[#B84233]";
}

function pnlSign(value: number) {
  return value >= 0 ? "+" : "";
}

export default function Review() {
  const navigate = useNavigate();
  const state = useGameStore();
  const { riskAlerts, levelId, turn } = state;
  const [toast, setToast] = useState<string | null>(null);

  const levelConfig = getLevelConfig(levelId);

  const settlement = useMemo(() => {
    return state.settlement ?? calcSettlement(state);
  }, [state]);

  const report = useMemo(() => generateReport(state), [state]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExportCsv = useCallback(() => {
    const r = generateReport(state);
    const csv = exportAsCsv(r);
    downloadFile(csv, `${levelId}-report.csv`, "text/csv;charset=utf-8");
    showToast("CSV 文件已导出");
  }, [state, levelId, showToast]);

  const handleExportJson = useCallback(() => {
    const r = generateReport(state);
    const json = exportAsJson(r);
    downloadFile(json, `${levelId}-report.json`, "application/json;charset=utf-8");
    showToast("JSON 文件已导出");
  }, [state, levelId, showToast]);

  const riskLevelColor = (level: string) => {
    if (level === "提示") return "text-amber-500";
    if (level === "警告") return "text-orange-500";
    return "text-[#B84233]";
  };

  const riskLevelBg = (level: string) => {
    if (level === "提示") return "bg-amber-500";
    if (level === "警告") return "bg-orange-500";
    return "bg-[#B84233]";
  };

  const totalFuturesPnL = settlement.futuresPnL.reduce((s, d) => s + d.pnl, 0);
  const totalSpotPnL = settlement.spotPnL.reduce((s, d) => s + d.pnl, 0);

  const summaryRows: {
    label: string;
    value: number;
    showSign: boolean;
    highlight?: boolean;
    prominent?: boolean;
  }[] = [
    { label: "期初资金", value: settlement.initialCash, showSign: false },
    { label: "期货总盈亏", value: totalFuturesPnL, showSign: true },
    { label: "现货总盈亏", value: totalSpotPnL, showSign: true },
    { label: "仓储成本", value: -settlement.storageCost, showSign: true },
    { label: "违约损失", value: -settlement.defaultLoss, showSign: true },
    { label: "净套保效果", value: settlement.netHedgingEffect, showSign: true, highlight: true },
    { label: "期末资金", value: settlement.finalCash, showSign: false, prominent: true },
  ];

  const completedTime = report.completedAt.replace("T", " ").slice(0, 19);

  return (
    <div className="min-h-screen bg-[#F5F0E8] pb-16">
      <header className="bg-[#2D3B2D] text-[#F5F0E8] px-6 py-5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-[#C8A951] hover:opacity-80 mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          返回关卡选择
        </button>
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#C8A951]" />
          <div>
            <h1 className="text-2xl font-bold">复盘报告</h1>
            <p className="text-sm text-[#F5F0E8]/70 mt-1">
              {levelConfig?.name ?? levelId} · 完成于 {completedTime} · 共 {report.totalTurns} 回合
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-[#2D3B2D] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C8A951]" />
            期货盈亏明细
          </h2>
          {settlement.futuresPnL.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-gray-400 text-center">暂无期货持仓记录</div>
          ) : (
            <div className="space-y-3">
              {settlement.futuresPnL.map((d) => (
                <div
                  key={d.positionId}
                  className="bg-white rounded-lg p-5 border-l-4 border-[#C8A951] shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[#2D3B2D]">
                      {d.commodity} · {d.direction}
                    </span>
                    <span className={`text-xl font-bold ${pnlColor(d.pnl)}`}>
                      {pnlSign(d.pnl)}{d.pnl.toLocaleString()} 元
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                    <span>开仓价 {d.openPrice.toLocaleString()} 元/吨</span>
                    <span>平仓价 {d.closePrice.toLocaleString()} 元/吨</span>
                    <span>{d.lots} 手 × {d.multiplier} 吨/手</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{d.conclusion}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#2D3B2D] mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-[#C8A951]" />
            现货盈亏明细
          </h2>
          {settlement.spotPnL.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-gray-400 text-center">暂无现货订单记录</div>
          ) : (
            <div className="space-y-3">
              {settlement.spotPnL.map((d) => (
                <div
                  key={d.orderId}
                  className={`bg-white rounded-lg p-5 border-l-4 shadow-sm ${
                    d.isDefaulted ? "border-[#B84233]" : "border-[#C8A951]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[#2D3B2D] flex items-center gap-2">
                      {d.commodity}
                      {d.isDefaulted ? (
                        <XCircle className="w-4 h-4 text-[#B84233]" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </span>
                    <span className={`text-xl font-bold ${pnlColor(d.pnl)}`}>
                      {pnlSign(d.pnl)}{d.pnl.toLocaleString()} 元
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                    <span>协议价 {d.agreedPrice.toLocaleString()} 元/吨</span>
                    <span>市场价 {d.marketPrice.toLocaleString()} 元/吨</span>
                    <span>数量 {d.quantity.toLocaleString()} 吨</span>
                    {d.isDefaulted && (
                      <span className="text-[#B84233]">
                        违约损失 {d.defaultLoss.toLocaleString()} 元
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{d.conclusion}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#2D3B2D] mb-4">基差分析</h2>
          {settlement.basisAnalysis.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-gray-400 text-center">暂无基差数据</div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#2D3B2D] text-[#F5F0E8]">
                    <th className="px-4 py-2.5 text-left font-medium">回合</th>
                    <th className="px-4 py-2.5 text-left font-medium">品种</th>
                    <th className="px-4 py-2.5 text-right font-medium">现货价</th>
                    <th className="px-4 py-2.5 text-right font-medium">期货价</th>
                    <th className="px-4 py-2.5 text-right font-medium">基差</th>
                    <th className="px-4 py-2.5 text-right font-medium">基差变动</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.basisAnalysis.map((d, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-2">{d.turn}</td>
                      <td className="px-4 py-2">{d.commodity}</td>
                      <td className="px-4 py-2 text-right">{d.spotPrice.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{d.futuresPrice.toLocaleString()}</td>
                      <td className={`px-4 py-2 text-right ${pnlColor(d.basis)}`}>
                        {d.basis.toLocaleString()}
                      </td>
                      <td className={`px-4 py-2 text-right ${pnlColor(d.basisChange)}`}>
                        {pnlSign(d.basisChange)}{d.basisChange.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#2D3B2D] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#C8A951]" />
            风险提示时间线
          </h2>
          {riskAlerts.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-gray-400 text-center">暂无风险提示</div>
          ) : (
            <div className="relative pl-8">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-300" />
              <div className="space-y-4">
                {riskAlerts.map((alert, i) => (
                  <div key={i} className="relative">
                    <div
                      className={`absolute -left-[1.3125rem] top-3.5 w-3.5 h-3.5 rounded-full ${riskLevelBg(alert.level)} border-2 border-white shadow-sm`}
                    />
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <AlertTriangle className={`w-4 h-4 ${riskLevelColor(alert.level)}`} />
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded text-white ${riskLevelBg(alert.level)}`}
                        >
                          {alert.level}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {alert.category}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">回合 {alert.turn}</span>
                      </div>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#2D3B2D] mb-4">综合损益</h2>
          <div className="bg-[#2D3B2D] rounded-lg p-6 text-[#F5F0E8]">
            <div className="space-y-3">
              {summaryRows.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between ${
                    row.prominent ? "pt-4 mt-2 border-t border-[#F5F0E8]/20" : ""
                  }`}
                >
                  <span className={row.highlight ? "text-[#C8A951] font-semibold" : ""}>
                    {row.label}
                    {row.highlight && " ★"}
                  </span>
                  <span
                    className={`${
                      row.prominent
                        ? "text-3xl font-bold"
                        : row.highlight
                          ? "text-xl font-bold text-[#C8A951]"
                          : "font-medium"
                    } ${pnlColor(row.value, true)}`}
                  >
                    {row.showSign
                      ? `${pnlSign(row.value)}${Math.abs(row.value).toLocaleString()} 元`
                      : `${row.value.toLocaleString()} 元`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#2D3B2D] mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-[#C8A951]" />
            导出报告
          </h2>
          <div className="flex gap-4">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-6 py-3 bg-[#2D3B2D] text-[#F5F0E8] rounded-lg hover:opacity-90 font-medium transition-opacity"
            >
              <Download className="w-4 h-4" />
              导出 CSV
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-6 py-3 bg-[#2D3B2D] text-[#F5F0E8] rounded-lg hover:opacity-90 font-medium transition-opacity"
            >
              <Download className="w-4 h-4" />
              导出 JSON
            </button>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#2D3B2D] text-[#F5F0E8] px-6 py-3 rounded-lg shadow-lg font-medium z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
