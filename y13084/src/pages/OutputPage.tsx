import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Sparkles,
  Star,
  ArrowLeft,
  Zap,
  Filter,
  ChevronDown,
  ExternalLink,
  Loader2,
  FileDown,
  Hash,
  Info,
} from "lucide-react";
import Papa from "papaparse";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useResultStore,
  useRecordsStore,
  useFilterStore,
  useShallow,
} from "@/store";
import { buildUnifiedResult } from "@/utils/processing";
import {
  RECORD_TYPE_LABEL,
  RECORD_TYPE_COLOR,
  RISK_LEVEL_LABEL,
  RISK_LEVEL_COLOR,
  ZONE_LABEL,
  type RecordType,
  type RiskLevel,
  type SensorRecord,
} from "@/types";
import { cn } from "@/lib/utils";

const SCHEME_TABS = [
  { id: "SCH-A", name: "A区方案", short: "A", desc: "近码头前沿" },
  { id: "SCH-B", name: "B区方案", short: "B", desc: "中部堆场" },
  { id: "SCH-C", name: "C区方案", short: "C", desc: "远岸后方" },
];

const RECORD_TYPE_OPTIONS: RecordType[] = [
  "normal",
  "old_version",
  "withdrawn",
  "verbal",
];
const RISK_OPTIONS: RiskLevel[] = ["low", "medium", "high", "critical"];

function getRecommendationBadge(index: number) {
  if (index >= 0.75) return { color: "bg-passgreen-500", text: "强烈推荐" };
  if (index >= 0.6) return { color: "bg-deepsea-500", text: "推荐" };
  if (index >= 0.45) return { color: "bg-alertyellow-500", text: "备选" };
  return { color: "bg-warnorange-500", text: "不推荐" };
}

function EmptyState() {
  const navigate = useNavigate();
  const resultStore = useResultStore(
    useShallow((s) => ({
      processing: s.processing,
      result: s.result,
    })),
  );
  const records = useRecordsStore((s) => s.records);
  const filter = useFilterStore(
    useShallow((s) => ({
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      zones: s.zones,
      riskLevels: s.riskLevels,
      recordTypes: s.recordTypes,
      searchKeyword: s.searchKeyword,
    })),
  );
  const startProcessing = useResultStore((s) => s.startProcessing);
  const finishProcessing = useResultStore((s) => s.finishProcessing);
  const failProcessing = useResultStore((s) => s.failProcessing);

  const handleGenerate = useCallback(() => {
    if (records.length === 0) {
      navigate("/");
      return;
    }
    startProcessing();
    setTimeout(() => {
      try {
        const condition = {
          timeStart: filter.timeStart,
          timeEnd: filter.timeEnd,
          zones: filter.zones,
          riskLevels: filter.riskLevels,
          recordTypes: filter.recordTypes,
          searchKeyword: filter.searchKeyword,
        };
        const unified = buildUnifiedResult(records, condition);
        finishProcessing(unified);
      } catch (e) {
        failProcessing(e instanceof Error ? e.message : "处理失败");
      }
    }, 800);
  }, [records, filter, navigate, startProcessing, finishProcessing, failProcessing]);

  if (resultStore.processing) {
    return (
      <div className="eng-card p-16 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="w-12 h-12 text-deepsea-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-deepsea-800 mb-2">正在生成分析结果</h2>
        <p className="text-deepsea-500">正在处理数据并构建统一结果...</p>
      </div>
    );
  }

  return (
    <div className="eng-card p-16 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-20 h-20 rounded-2xl bg-deepsea-100 flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-deepsea-500" />
      </div>
      <h2 className="text-2xl font-bold text-deepsea-900 mb-3">暂无分析结果</h2>
      <p className="text-deepsea-500 mb-8 text-center max-w-md">
        请先在工作台执行统一处理链，或点击下方按钮一键生成统计、明细与报告
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/workbench")}
          className="eng-btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </button>
        <button
          onClick={handleGenerate}
          disabled={records.length === 0}
          className="eng-btn-primary"
        >
          <Zap className="w-4 h-4" />
          一键生成结果
        </button>
      </div>
      {records.length === 0 && (
        <p className="mt-4 text-sm text-warnorange-600">
          提示：当前无任何记录数据，请先返回引导页上传或加载演示数据
        </p>
      )}
    </div>
  );
}

interface SchemeTabProps {
  scheme: typeof SCHEME_TABS[number];
  active: boolean;
  recIndex: number;
  onClick: () => void;
}

function SchemeTab({ scheme, active, recIndex, onClick }: SchemeTabProps) {
  const badge = getRecommendationBadge(recIndex);
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all duration-200",
        active
          ? "bg-deepsea-500 border-deepsea-500 text-white shadow-lg shadow-deepsea-200"
          : "bg-white border-deepsea-200 text-deepsea-700 hover:border-deepsea-400 hover:bg-deepsea-50",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0",
          active ? "bg-white/20 text-white" : "bg-deepsea-100 text-deepsea-700",
        )}
      >
        {scheme.short}
      </div>
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2">
          <span className="font-bold">{scheme.name}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white",
              badge.color,
            )}
          >
            <Star className="w-3 h-3" />
            {badge.text}
          </span>
        </div>
        <span className={cn("text-xs", active ? "text-white/70" : "text-deepsea-400")}>
          {scheme.desc} · 指数 {(recIndex * 100).toFixed(0)}
        </span>
      </div>
    </button>
  );
}

function StatisticsCard({
  selectedScheme,
  onExport,
}: {
  selectedScheme: string;
  onExport: () => void;
}) {
  const result = useResultStore((s) => s.result)!;
  const { schemeComparison } = result.statistics;

  const riskFromScore = (score: number | string): RiskLevel => {
    const n = typeof score === "string" ? parseInt(score) : score;
    return (["low", "medium", "high", "critical"] as RiskLevel[])[n - 1] ?? "medium";
  };

  const getRecommendationNote = () => {
    const sorted = [...schemeComparison].sort(
      (a, b) => (b.indicators.推荐指数 as number) - (a.indicators.推荐指数 as number),
    );
    const best = sorted[0];
    const second = sorted[1];
    const bestIdx = best.indicators.推荐指数 as number;
    const secIdx = second.indicators.推荐指数 as number;
    const gap = ((bestIdx - secIdx) * 100).toFixed(1);
    return `推荐首选 ${best.schemeName.split(" · ")[0]}，综合推荐指数 ${(bestIdx * 100).toFixed(0)} 分，领先次优方案 ${gap} 分。建议结合现场踏勘进一步确认。`;
  };

  const rows = [
    { key: "面积", unit: "㎡", formatter: (v: number) => v.toLocaleString() },
    { key: "距码头", unit: "m", formatter: (v: number) => v.toString() },
    { key: "距办公区", unit: "m", formatter: (v: number) => v.toString() },
    { key: "风险", unit: "", formatter: (_v: number, raw: number | string) => {
      const rl = riskFromScore(raw);
      return RISK_LEVEL_LABEL[rl];
    }, isRisk: true },
    { key: "造价", unit: "万元", formatter: (v: number) => v.toLocaleString() },
    { key: "容量", unit: "吨", formatter: (v: number) => v.toLocaleString() },
    { key: "推荐指数", unit: "", formatter: (v: number) => (v * 100).toFixed(0) + " 分", isRec: true },
  ];

  return (
    <div className="eng-card flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-deepsea-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900">方案对比统计表</h3>
        </div>
        <button
          onClick={onExport}
          className="eng-btn-ghost px-3 py-1.5 text-xs"
        >
          <FileDown className="w-3.5 h-3.5" />
          导出
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full eng-table">
          <thead className="sticky top-0 bg-deepsea-50 z-10">
            <tr>
              <th className="w-28">指标</th>
              {schemeComparison.map((sc) => {
                const isActive = sc.schemeId === selectedScheme;
                return (
                  <th key={sc.schemeId} className={cn(
                    "text-center",
                    isActive && "bg-deepsea-100",
                  )}>
                    {ZONE_LABEL[sc.schemeId.split("-")[1] as "A" | "B" | "C"]?.split("-")[0] || sc.schemeId}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-deepsea-50 last:border-0">
                <td className="font-medium text-deepsea-700 bg-deepsea-50/50">
                  {row.key}
                  {row.unit && <span className="text-deepsea-400 text-xs ml-1">({row.unit})</span>}
                </td>
                {schemeComparison.map((sc) => {
                  const isActive = sc.schemeId === selectedScheme;
                  const ind = sc.indicators;
                  const rawVal = ind[row.key];
                  const val = typeof rawVal === "number" ? rawVal : 0;
                  const display = row.formatter(val, rawVal);
                  return (
                    <td
                      key={sc.schemeId}
                      className={cn(
                        "text-center",
                        isActive && "bg-deepsea-500/10 font-semibold",
                      )}
                    >
                      {row.isRisk ? (
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white",
                            RISK_LEVEL_COLOR[riskFromScore(rawVal)],
                          )}
                        >
                          {display}
                        </span>
                      ) : row.isRec ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={cn(
                            "font-bold",
                            (val as number) >= 0.75 ? "text-passgreen-600" :
                            (val as number) >= 0.6 ? "text-deepsea-600" :
                            (val as number) >= 0.45 ? "text-alertyellow-600" : "text-warnorange-600",
                          )}>
                            {display}
                          </span>
                          <div className="w-full h-1.5 bg-deepsea-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                (val as number) >= 0.75 ? "bg-passgreen-500" :
                                (val as number) >= 0.6 ? "bg-deepsea-500" :
                                (val as number) >= 0.45 ? "bg-alertyellow-500" : "bg-warnorange-500",
                              )}
                              style={{ width: `${(val as number) * 100}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-deepsea-800 font-mono">{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-deepsea-50 to-deepsea-100/50 border-t-2 border-deepsea-200">
              <td
                colSpan={schemeComparison.length + 1}
                className="px-4 py-3"
              >
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-deepsea-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-deepsea-700 text-xs uppercase tracking-wide">推荐备注：</span>
                    <p className="text-sm text-deepsea-800 mt-0.5 leading-relaxed">
                      {getRecommendationNote()}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DetailCard({ onExport }: { onExport: (data: SensorRecord[]) => void }) {
  const navigate = useNavigate();
  const result = useResultStore((s) => s.result)!;
  const [typeFilter, setTypeFilter] = useState<RecordType[]>([]);
  const [riskFilter, setRiskFilter] = useState<RiskLevel[]>([]);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [riskDropdownOpen, setRiskDropdownOpen] = useState(false);

  const filteredRecords = useMemo(() => {
    return result.detailTable.filter((r) => {
      if (typeFilter.length > 0 && !typeFilter.includes(r.recordType)) return false;
      if (riskFilter.length > 0 && !riskFilter.includes(r.riskLevel)) return false;
      return true;
    });
  }, [result.detailTable, typeFilter, riskFilter]);

  const toggleType = (t: RecordType) => {
    setTypeFilter((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };
  const toggleRisk = (r: RiskLevel) => {
    setRiskFilter((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  const handleRowClick = (record: SensorRecord) => {
    useRecordsStore.setState({ records: useRecordsStore.getState().records });
    navigate(`/workbench?highlight=${record.id}&row=${record.sourceRow}`);
  };

  return (
    <div className="eng-card flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-deepsea-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900">明细记录</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-deepsea-100 text-deepsea-600 font-medium">
            {filteredRecords.length} 条
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => { setTypeDropdownOpen(!typeDropdownOpen); setRiskDropdownOpen(false); }}
              className={cn(
                "eng-btn-ghost px-3 py-1.5 text-xs gap-1",
                typeFilter.length > 0 && "bg-deepsea-100",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              类型
              {typeFilter.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-deepsea-500 text-white text-[10px] flex items-center justify-center">
                  {typeFilter.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>
            {typeDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-deepsea-200 rounded-lg shadow-lg p-2 z-20 min-w-[140px]">
                {RECORD_TYPE_OPTIONS.map((t) => {
                  const checked = typeFilter.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-deepsea-50 text-sm text-left"
                    >
                      <span className={cn("w-3 h-3 rounded-full", RECORD_TYPE_COLOR[t])} />
                      <span className="text-deepsea-700">{RECORD_TYPE_LABEL[t]}</span>
                      {checked && <span className="ml-auto text-deepsea-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => { setRiskDropdownOpen(!riskDropdownOpen); setTypeDropdownOpen(false); }}
              className={cn(
                "eng-btn-ghost px-3 py-1.5 text-xs gap-1",
                riskFilter.length > 0 && "bg-deepsea-100",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              风险
              {riskFilter.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-deepsea-500 text-white text-[10px] flex items-center justify-center">
                  {riskFilter.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>
            {riskDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-deepsea-200 rounded-lg shadow-lg p-2 z-20 min-w-[140px]">
                {RISK_OPTIONS.map((r) => {
                  const checked = riskFilter.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRisk(r)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-deepsea-50 text-sm text-left"
                    >
                      <span className={cn("w-3 h-3 rounded-full", RISK_LEVEL_COLOR[r])} />
                      <span className="text-deepsea-700">{RISK_LEVEL_LABEL[r]}</span>
                      {checked && <span className="ml-auto text-deepsea-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => onExport(filteredRecords)}
            className="eng-btn-primary px-3 py-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            导出CSV
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full eng-table">
          <thead className="sticky top-0 bg-deepsea-50 z-10">
            <tr>
              <th className="w-12 text-center">
                <Hash className="w-3.5 h-3.5 inline" />
              </th>
              <th>记录ID</th>
              <th>类型</th>
              <th>风险</th>
              <th>区域</th>
              <th className="max-w-[200px]">描述</th>
              <th className="w-10 text-right" />
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-deepsea-400">
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-deepsea-300" />
                    <p className="text-sm">无匹配的明细记录</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => (
                <tr
                  key={r.id}
                  onClick={() => handleRowClick(r)}
                  className={cn(
                    "cursor-pointer transition-all border-b border-deepsea-50 last:border-0 group",
                    idx % 2 === 1 ? "bg-deepsea-50/30" : "bg-white",
                    "hover:bg-deepsea-100/50",
                  )}
                >
                  <td className="text-center">
                    <span className="font-mono text-xs text-deepsea-500">
                      {r.sourceRow}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-deepsea-700 font-medium">
                      {r.id}
                    </span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white",
                        RECORD_TYPE_COLOR[r.recordType],
                      )}
                    >
                      {RECORD_TYPE_LABEL[r.recordType]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white",
                        RISK_LEVEL_COLOR[r.riskLevel],
                      )}
                    >
                      {RISK_LEVEL_LABEL[r.riskLevel]}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm text-deepsea-700">
                      {ZONE_LABEL[r.zone]?.split("-")[0] || r.zone}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate text-sm text-deepsea-700">
                    {r.description}
                  </td>
                  <td className="text-right">
                    <ExternalLink className="w-3.5 h-3.5 text-deepsea-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarkdownCard({ onExport }: { onExport: () => void }) {
  const result = useResultStore((s) => s.result)!;
  const [hoveredFootnote, setHoveredFootnote] = useState<string | null>(null);

  const footnoteMap = useMemo(() => {
    const map: Record<string, string> = {};
    const lines = result.markdownReport.split("\n");
    for (const line of lines) {
      const match = line.match(/^\[\^(.+?)\]:\s*(.+)$/);
      if (match) {
        map[match[1]] = match[2];
      }
    }
    return map;
  }, [result.markdownReport]);

  return (
    <div className="eng-card flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-deepsea-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900">Markdown 评审报告</h3>
        </div>
        <button
          onClick={onExport}
          className="eng-btn-primary px-3 py-1.5 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          导出 .md
        </button>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <article className="prose prose-sm max-w-none prose-headings:text-deepsea-900 prose-h1:text-xl prose-h1:font-bold prose-h2:text-lg prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-h3:font-semibold prose-p:text-deepsea-700 prose-p:leading-relaxed prose-a:text-deepsea-600 prose-a:no-underline hover:prose-a:underline prose-table:w-full prose-table:text-sm prose-th:bg-deepsea-50 prose-th:text-deepsea-700 prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-deepsea-200 prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-deepsea-100 prose-td:text-deepsea-700 prose-code:text-deepsea-700 prose-code:bg-deepsea-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-ol:space-y-1 prose-li:text-deepsea-700 prose-li:text-sm prose-strong:text-deepsea-900">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children, ...props }) => {
                const footnoteMatch = typeof children === "string" ? children.match(/^\[(.+)\]$/) : null;
                const footnoteId = footnoteMatch ? footnoteMatch[1] : null;
                const supMatch = href?.match(/#fn(?:ref)?-(.+)/);
                const fnId = footnoteId || supMatch?.[1];
                if (fnId && footnoteMap[fnId]) {
                  return (
                    <span
                      className="relative inline-flex cursor-help"
                      onMouseEnter={() => setHoveredFootnote(fnId)}
                      onMouseLeave={() => setHoveredFootnote(null)}
                    >
                      <sup className="text-deepsea-500 font-mono text-[10px] bg-deepsea-100 px-1 rounded hover:bg-deepsea-200 transition-colors">
                        [{fnId}]
                      </sup>
                      {hoveredFootnote === fnId && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-deepsea-900 text-white text-xs rounded-lg shadow-xl z-50 whitespace-normal break-words leading-relaxed">
                          <span className="block font-semibold text-deepsea-200 mb-1">来源提示</span>
                          {footnoteMap[fnId]}
                          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-deepsea-900" />
                        </span>
                      )}
                    </span>
                  );
                }
                return (
                  <a href={href} {...props}>
                    {children}
                  </a>
                );
              },
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-deepsea-900 mb-4 pb-3 border-b-2 border-deepsea-200">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold text-deepsea-800 mt-6 mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-deepsea-500 rounded-full shrink-0" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-deepsea-700 mt-4 mb-2">
                  {children}
                </h3>
              ),
              table: ({ children }) => (
                <div className="my-3 overflow-x-auto rounded-lg border border-deepsea-200">
                  <table className="min-w-full border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-deepsea-50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left text-xs font-semibold text-deepsea-700 uppercase tracking-wide border-b border-deepsea-200">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-sm text-deepsea-700 border-b border-deepsea-100 last:border-b-0">
                  {children}
                </td>
              ),
              p: ({ children }) => (
                <p className="text-sm text-deepsea-700 leading-relaxed my-2">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm text-deepsea-700">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-deepsea-900">{children}</strong>
              ),
            }}
          >
            {result.markdownReport}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

export default function OutputPage() {
  const result = useResultStore((s) => s.result);
  const [selectedScheme, setSelectedScheme] = useState("SCH-C");

  const schemeRecIndices = useMemo(() => {
    const map: Record<string, number> = {};
    if (result) {
      result.statistics.schemeComparison.forEach((sc) => {
        map[sc.schemeId] = sc.indicators.推荐指数 as number;
      });
    }
    return map;
  }, [result]);

  const handleExportStats = useCallback(() => {
    if (!result) return;
    const { schemeComparison } = result.statistics;
    const rows = schemeComparison.map((sc) => ({
      方案: sc.schemeName,
      "面积_㎡": sc.indicators.面积,
      "距码头_m": sc.indicators.距码头,
      "距办公区_m": sc.indicators.距办公区,
      风险等级: RISK_LEVEL_LABEL[
        (["low", "medium", "high", "critical"] as RiskLevel[])[
          (sc.indicators.风险 as number) - 1
        ]
      ],
      造价_万元: sc.indicators.造价,
      容量_吨: sc.indicators.容量,
      推荐指数: ((sc.indicators.推荐指数 as number) * 100).toFixed(0) + "分",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `方案对比统计_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleExportDetail = useCallback((records: SensorRecord[]) => {
    const rows = records.map((r) => ({
      来源行号: r.sourceRow,
      记录ID: r.id,
      时间戳: r.timestamp.replace("T", " ").slice(0, 19),
      记录类型: RECORD_TYPE_LABEL[r.recordType],
      风险等级: RISK_LEVEL_LABEL[r.riskLevel],
      区域: ZONE_LABEL[r.zone],
      "温度_℃": r.temperature ?? "",
      "湿度_%": r.humidity ?? "",
      "气体浓度_%LEL": r.gasConcentration ?? "",
      描述: r.description,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `明细记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportMarkdown = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.markdownReport], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `评审报告_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  if (!result) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-5 min-h-[calc(100vh-8rem)]">
      <div className="eng-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-deepsea-600" />
            <h2 className="text-lg font-bold text-deepsea-900">方案选择</h2>
            <span className="text-xs text-deepsea-500">点击切换查看不同方案的高亮统计</span>
          </div>
          <div className="text-xs text-deepsea-500">
            共 {result.statistics.totalRecords} 条记录参与分析
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SCHEME_TABS.map((tab) => (
            <SchemeTab
              key={tab.id}
              scheme={tab}
              active={selectedScheme === tab.id}
              recIndex={schemeRecIndices[tab.id] ?? 0}
              onClick={() => setSelectedScheme(tab.id)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: "650px" }}>
        <StatisticsCard
          selectedScheme={selectedScheme}
          onExport={handleExportStats}
        />
        <DetailCard onExport={handleExportDetail} />
        <MarkdownCard onExport={handleExportMarkdown} />
      </div>
    </div>
  );
}
