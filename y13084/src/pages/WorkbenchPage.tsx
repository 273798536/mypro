import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  MapPin,
  AlertTriangle,
  FileType,
  Search,
  RotateCcw,
  Archive,
  Undo2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  BarChart3,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Zap,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  Link as LinkIcon,
  Hash,
  Clock,
  PlayCircle,
} from "lucide-react";
import {
  useRecordsStore,
  useFilterStore,
  useResultStore,
  useShallow,
} from "@/store";
import { buildUnifiedResult, applyFilter } from "@/utils/processing";
import {
  RECORD_TYPE_LABEL,
  RECORD_TYPE_COLOR,
  RISK_LEVEL_LABEL,
  RISK_LEVEL_COLOR,
  ZONE_LABEL,
  type RecordType,
  type RiskLevel,
  type WarehouseZone,
  type SensorRecord,
} from "@/types";
import { cn } from "@/lib/utils";
import { getConclusionById } from "@/data/mockData";

const ZONE_OPTIONS: WarehouseZone[] = ["A", "B", "C"];
const RISK_OPTIONS: RiskLevel[] = ["low", "medium", "high", "critical"];
const RECORD_TYPE_OPTIONS: RecordType[] = [
  "normal",
  "old_version",
  "withdrawn",
  "verbal",
];

function useFilterCondition() {
  return useFilterStore(
    useShallow((s) => ({
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      zones: s.zones,
      riskLevels: s.riskLevels,
      recordTypes: s.recordTypes,
      searchKeyword: s.searchKeyword,
      setTimeStart: s.setTimeStart,
      setTimeEnd: s.setTimeEnd,
      toggleZone: s.toggleZone,
      toggleRiskLevel: s.toggleRiskLevel,
      toggleRecordType: s.toggleRecordType,
      setSearchKeyword: s.setSearchKeyword,
      resetFilters: s.resetFilters,
    })),
  );
}

function FilterPanel() {
  const f = useFilterCondition();

  return (
    <aside className="eng-card p-5 space-y-6 h-fit sticky top-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900">筛选条件</h3>
        </div>
        <button
          onClick={f.resetFilters}
          className="eng-btn-ghost px-2 py-1 text-xs flex items-center gap-1 text-deepsea-500 hover:text-deepsea-700"
        >
          <RotateCcw className="w-3 h-3" />
          重置
        </button>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-deepsea-700">
          <Calendar className="w-4 h-4" />
          时间范围
        </label>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={f.timeStart?.slice(0, 10) ?? ""}
              onChange={(e) =>
                f.setTimeStart(e.target.value ? `${e.target.value}T00:00:00` : null)
              }
              className="flex-1 rounded-lg border border-deepsea-200 bg-white px-3 py-2 text-sm text-deepsea-800 focus:border-deepsea-500 focus:ring-2 focus:ring-deepsea-500/20 focus:outline-none transition-all"
            />
          </div>
          <div className="text-center text-deepsea-400 text-xs">至</div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={f.timeEnd?.slice(0, 10) ?? ""}
              onChange={(e) =>
                f.setTimeEnd(e.target.value ? `${e.target.value}T23:59:59` : null)
              }
              className="flex-1 rounded-lg border border-deepsea-200 bg-white px-3 py-2 text-sm text-deepsea-800 focus:border-deepsea-500 focus:ring-2 focus:ring-deepsea-500/20 focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-deepsea-700">
          <MapPin className="w-4 h-4" />
          库区
        </label>
        <div className="flex flex-wrap gap-2">
          {ZONE_OPTIONS.map((zone) => {
            const active = f.zones.includes(zone);
            return (
              <button
                key={zone}
                onClick={() => f.toggleZone(zone)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                  active
                    ? "bg-deepsea-500 text-white border-deepsea-500 shadow-sm"
                    : "bg-white text-deepsea-600 border-deepsea-200 hover:border-deepsea-400 hover:bg-deepsea-50",
                )}
              >
                {ZONE_LABEL[zone]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-deepsea-700">
          <AlertTriangle className="w-4 h-4" />
          风险等级
        </label>
        <div className="flex flex-col gap-2">
          {RISK_OPTIONS.map((risk) => {
            const active = f.riskLevels.includes(risk);
            return (
              <button
                key={risk}
                onClick={() => f.toggleRiskLevel(risk)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border text-left",
                  active
                    ? "border-transparent shadow-sm"
                    : "bg-white text-deepsea-600 border-deepsea-200 hover:border-deepsea-400 hover:bg-deepsea-50",
                )}
              >
                <span
                  className={cn(
                    "w-3 h-3 rounded-full shrink-0",
                    RISK_LEVEL_COLOR[risk],
                  )}
                />
                <span className={active ? "text-white" : ""}>
                  {RISK_LEVEL_LABEL[risk]}
                </span>
                {active && (
                  <div className="absolute inset-0 rounded-lg opacity-90" aria-hidden />
                )}
                {active && (
                  <style>{`button[aria-selected="true"] { background: transparent; }`}</style>
                )}
                <div
                  className={cn(
                    "w-full -ml-[calc(100%+0.5rem)] h-full absolute -left-2 top-0 rounded-lg z-0",
                    active ? RISK_LEVEL_COLOR[risk] : "",
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-deepsea-700">
          <FileType className="w-4 h-4" />
          记录类型
        </label>
        <div className="flex flex-col gap-2">
          {RECORD_TYPE_OPTIONS.map((type) => {
            const active = f.recordTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => f.toggleRecordType(type)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border text-left relative overflow-hidden",
                  active ? "text-white border-transparent shadow-sm" : "bg-white text-deepsea-600 border-deepsea-200 hover:border-deepsea-400 hover:bg-deepsea-50",
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 z-0 opacity-90",
                    active ? RECORD_TYPE_COLOR[type] : "",
                  )}
                  aria-hidden
                />
                <span className="relative z-10 w-2 h-2 rounded-full shrink-0 bg-white/30" />
                <span className="relative z-10">{RECORD_TYPE_LABEL[type]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-deepsea-700">
          <Search className="w-4 h-4" />
          关键词
        </label>
        <div className="relative">
          <input
            type="text"
            value={f.searchKeyword}
            onChange={(e) => f.setSearchKeyword(e.target.value)}
            placeholder="搜索描述/编号/区域..."
            className="w-full rounded-lg border border-deepsea-200 bg-white pl-9 pr-3 py-2 text-sm text-deepsea-800 placeholder-deepsea-400 focus:border-deepsea-500 focus:ring-2 focus:ring-deepsea-500/20 focus:outline-none transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-deepsea-400" />
        </div>
      </div>
    </aside>
  );
}

interface TraceCardProps {
  title: string;
  icon: typeof Archive;
  color: string;
  badge: string;
  records: SensorRecord[];
}

function TraceCard({ title, icon: Icon, color, badge, records }: TraceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const count = records.length;

  return (
    <div
      className={cn(
        "eng-card overflow-hidden transition-all duration-200",
        expanded ? "shadow-lg" : "",
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-deepsea-50/50 transition-colors text-left"
      >
        <div className={cn("p-2.5 rounded-xl shrink-0", badge)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-bold text-deepsea-900">{title}</h4>
            <span
              className={cn(
                "inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full text-sm font-bold text-white shadow-sm",
                color,
              )}
            >
              {count}
            </span>
          </div>
          <p className="text-xs text-deepsea-500 truncate">
            {count > 0
              ? `影响 ${records.reduce(
                  (s, r) => s + r.affectsConclusions.length,
                  0,
                )} 条结论，来源行 ${records.map((r) => r.sourceRow).join(", ")}`
              : "当前筛选条件下无此类记录"}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-deepsea-400 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-deepsea-400 shrink-0" />
        )}
      </button>

      {expanded && count > 0 && (
        <div className="border-t border-deepsea-100 bg-deepsea-50/30 px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
          {records.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-lg border border-deepsea-100 p-3 text-sm"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-deepsea-100 text-deepsea-700">
                  {r.id}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-deepsea-500">
                  <Hash className="w-3 h-3" />
                  行 {r.sourceRow}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-deepsea-500">
                  <Clock className="w-3 h-3" />
                  {r.timestamp.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <p className="text-deepsea-700 mb-2 line-clamp-2">{r.description}</p>
              {r.affectsConclusions.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-deepsea-50">
                  <div className="flex items-center gap-1 text-xs font-medium text-warnorange-600">
                    <LinkIcon className="w-3 h-3" />
                    影响结论：
                  </div>
                  <ul className="space-y-1">
                    {r.affectsConclusions.map((cidRaw) => {
                      const match = cidRaw.match(/^(C-\d+)/);
                      const cid = match ? match[1] : cidRaw;
                      const text = getConclusionById(cid) ?? cidRaw;
                      return (
                        <li
                          key={cidRaw}
                          className="text-xs text-deepsea-600 pl-3 border-l-2 border-warnorange-300"
                        >
                          <span className="font-bold text-warnorange-700 mr-1">
                            {cid}
                          </span>
                          {text.replace(/^C-\d+\s*/, "")}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TraceSection({ records }: { records: SensorRecord[] }) {
  const oldVersionRecords = records.filter((r) => r.recordType === "old_version");
  const withdrawnRecords = records.filter((r) => r.recordType === "withdrawn");
  const verbalRecords = records.filter((r) => r.recordType === "verbal");

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-deepsea-600" />
        <h3 className="font-bold text-deepsea-900">溯源分流区</h3>
        <span className="text-xs text-deepsea-400">
          自动识别三类异常记录，点击展开查看影响的结论行与来源行
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TraceCard
          title="旧版记录"
          icon={Archive}
          color="bg-deepsea-500"
          badge="bg-deepsea-100 text-deepsea-700"
          records={oldVersionRecords}
        />
        <TraceCard
          title="撤回记录"
          icon={Undo2}
          color="bg-alertyellow-500"
          badge="bg-alertyellow-100 text-alertyellow-700"
          records={withdrawnRecords}
        />
        <TraceCard
          title="口头备注"
          icon={MessageSquare}
          color="bg-warnorange-500"
          badge="bg-warnorange-100 text-warnorange-700"
          records={verbalRecords}
        />
      </div>
    </section>
  );
}

function RecordRow({
  record,
  index,
}: {
  record: SensorRecord;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isZebra = index % 2 === 1;

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "cursor-pointer transition-all border-b border-deepsea-100 group",
          isZebra ? "bg-deepsea-50/30" : "bg-white",
          "hover:bg-deepsea-100/40",
          record.recordType === "old_version" ? "line-through decoration-deepsea-400/50" : "",
          record.recordType === "withdrawn" ? "bg-alertyellow-50/40" : "",
          record.recordType === "verbal" ? "bg-warnorange-50/20" : "",
        )}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0",
                RECORD_TYPE_COLOR[record.recordType],
              )}
            />
            <span className="font-mono text-xs text-deepsea-700 font-medium">
              {record.id}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs text-deepsea-500">
            {record.timestamp.slice(0, 16).replace("T", " ")}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-deepsea-700">
            {ZONE_LABEL[record.zone]}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white",
              RISK_LEVEL_COLOR[record.riskLevel],
            )}
          >
            {RISK_LEVEL_LABEL[record.riskLevel]}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-white",
              RECORD_TYPE_COLOR[record.recordType],
            )}
          >
            {RECORD_TYPE_LABEL[record.recordType]}
          </span>
        </td>
        <td
          className={cn(
            "px-4 py-3 text-sm text-deepsea-700 max-w-xs truncate",
            record.recordType === "verbal" ? "text-right italic" : "",
          )}
        >
          {record.description}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-xs font-mono text-deepsea-500">
            {record.sourceRow}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-deepsea-500 ml-auto" />
          ) : (
            <ChevronRight className="w-4 h-4 text-deepsea-400 ml-auto group-hover:text-deepsea-600" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-deepsea-900/[0.02] border-b border-deepsea-100">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-medium text-deepsea-500 uppercase tracking-wide">
                  传感器读数
                </div>
                <div className="space-y-1.5">
                  {record.temperature !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-deepsea-700">
                      <Thermometer className="w-4 h-4 text-warnorange-500" />
                      温度：
                      <span className="font-mono font-medium">
                        {record.temperature}°C
                      </span>
                    </div>
                  )}
                  {record.humidity !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-deepsea-700">
                      <Droplets className="w-4 h-4 text-deepsea-500" />
                      湿度：
                      <span className="font-mono font-medium">
                        {record.humidity}%
                      </span>
                    </div>
                  )}
                  {record.gasConcentration !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-deepsea-700">
                      <Wind className="w-4 h-4 text-passgreen-500" />
                      气体：
                      <span className="font-mono font-medium">
                        {record.gasConcentration}%LEL
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-deepsea-500 uppercase tracking-wide">
                  来源信息
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-deepsea-700">
                    <Hash className="w-4 h-4 text-deepsea-400" />
                    Excel行号：
                    <span className="font-mono font-medium">
                      第 {record.sourceRow} 行
                    </span>
                  </div>
                  {record.replacedBy && (
                    <div className="flex items-start gap-2 text-deepsea-700">
                      <ArrowRight className="w-4 h-4 text-deepsea-400 mt-0.5 shrink-0" />
                      <span>
                        被 <span className="font-mono font-medium text-deepsea-800">{record.replacedBy}</span> 替代
                      </span>
                    </div>
                  )}
                  {record.withdrawReason && (
                    <div className="flex items-start gap-2 text-alertyellow-700">
                      <Undo2 className="w-4 h-4 text-alertyellow-500 mt-0.5 shrink-0" />
                      <span>撤回：{record.withdrawReason}</span>
                    </div>
                  )}
                </div>
              </div>

              {record.affectsConclusions.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <div className="text-xs font-medium text-deepsea-500 uppercase tracking-wide">
                    影响的结论（{record.affectsConclusions.length}）
                  </div>
                  <ul className="space-y-1.5">
                    {record.affectsConclusions.map((cidRaw) => {
                      const match = cidRaw.match(/^(C-\d+)/);
                      const cid = match ? match[1] : cidRaw;
                      const text = getConclusionById(cid) ?? cidRaw;
                      return (
                        <li
                          key={cidRaw}
                          className="flex items-start gap-2 text-sm text-deepsea-700 pl-3 border-l-2 border-warnorange-300"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-warnorange-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold text-warnorange-700 mr-1">
                              {cid}
                            </span>
                            {text.replace(/^C-\d+\s*/, "")}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function RecordsTable({ records }: { records: SensorRecord[] }) {
  return (
    <section className="eng-card overflow-hidden">
      <div className="px-5 py-4 border-b border-deepsea-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900">原始记录明细</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-deepsea-100 text-deepsea-600 font-medium">
            {records.length} 条
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-deepsea-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-passgreen-400" />
            正式
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-deepsea-300" />
            旧版
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-alertyellow-400" />
            撤回
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warnorange-400" />
            口头
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-sm eng-table">
          <thead className="sticky top-0 bg-deepsea-50 z-10">
            <tr className="text-left text-deepsea-600 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-semibold">记录编号</th>
              <th className="px-4 py-3 font-semibold">时间</th>
              <th className="px-4 py-3 font-semibold">区域</th>
              <th className="px-4 py-3 font-semibold">风险</th>
              <th className="px-4 py-3 font-semibold">类型</th>
              <th className="px-4 py-3 font-semibold">描述</th>
              <th className="px-4 py-3 font-semibold text-center">行号</th>
              <th className="px-4 py-3 font-semibold text-right w-10" />
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-deepsea-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Database className="w-10 h-10 text-deepsea-300" />
                    <p>当前筛选条件下无匹配记录</p>
                    <p className="text-xs">请调整筛选条件，或先上传数据</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((r, idx) => (
                <RecordRow key={r.id} record={r} index={idx} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProcessingPanel({
  totalCount,
  filteredCount,
}: {
  totalCount: number;
  filteredCount: number;
}) {
  const navigate = useNavigate();
  const { processing, error, result } = useResultStore(
    useShallow((s) => ({
      processing: s.processing,
      error: s.error,
      result: s.result,
    })),
  );
  const startProcessing = useResultStore((s) => s.startProcessing);
  const finishProcessing = useResultStore((s) => s.finishProcessing);
  const failProcessing = useResultStore((s) => s.failProcessing);
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

  const handleRun = () => {
    if (records.length === 0) return;
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
  };

  const progress = result ? 100 : processing ? 60 : 0;

  return (
    <aside className="space-y-5 sticky top-20 h-fit">
      <div className="eng-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900">统一处理</h3>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-deepsea-500">原始记录</span>
            <span className="font-mono font-bold text-deepsea-800">
              {totalCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-deepsea-500">筛选后</span>
            <span className="font-mono font-bold text-deepsea-800">
              {filteredCount}
            </span>
          </div>
          <div className="h-px bg-deepsea-100" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-deepsea-600 font-medium">处理进度</span>
            <span className="font-mono font-bold text-deepsea-800">
              {progress}%
            </span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-deepsea-100 rounded-full overflow-hidden mb-5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              error
                ? "bg-red-500"
                : result
                  ? "bg-gradient-to-r from-passgreen-400 to-passgreen-600"
                  : "bg-gradient-to-r from-deepsea-400 via-deepsea-500 to-warnorange-400 animate-pulse",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-passgreen-50 border border-passgreen-200 text-sm text-passgreen-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">处理完成</p>
              <p className="text-xs mt-0.5 text-passgreen-600">
                统计表、明细表、Markdown报告已就绪
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleRun}
            disabled={processing || totalCount === 0}
            className={cn(
              "eng-btn-primary w-full py-2.5",
              processing ? "opacity-80" : "",
            )}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中...
              </>
            ) : result ? (
              <>
                <Play className="w-4 h-4" />
                重新生成结果
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                执行统一处理链
              </>
            )}
          </button>

          {result && (
            <button
              onClick={() => navigate("/output")}
              className="eng-btn-secondary w-full py-2.5"
            >
              <BarChart3 className="w-4 h-4" />
              查看输出结果
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="eng-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900">输出预览</h3>
        </div>
        <div className="space-y-2">
          {[
            {
              icon: BarChart3,
              label: "统计表",
              desc: "类型/风险/区域分布 + 方案比选指标",
              ready: !!result,
            },
            {
              icon: Database,
              label: "明细表",
              desc: "筛选后的全部原始记录及来源行",
              ready: !!result,
            },
            {
              icon: FileText,
              label: "Markdown报告",
              desc: "含结论溯源脚注的完整评审报告",
              ready: !!result,
            },
          ].map((item) => {
            const Ico = item.icon;
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all",
                  item.ready
                    ? "bg-passgreen-50 border-passgreen-200"
                    : "bg-deepsea-50/50 border-deepsea-100",
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-md shrink-0",
                    item.ready
                      ? "bg-passgreen-500 text-white"
                      : "bg-deepsea-200 text-deepsea-400",
                  )}
                >
                  <Ico className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        item.ready ? "text-passgreen-800" : "text-deepsea-500",
                      )}
                    >
                      {item.label}
                    </span>
                    {item.ready && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-passgreen-500" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-xs mt-0.5",
                      item.ready ? "text-passgreen-600" : "text-deepsea-400",
                    )}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalCount === 0 && (
        <div className="eng-card p-5 border-warnorange-300 bg-warnorange-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warnorange-600" />
            <h3 className="font-bold text-warnorange-800">暂无数据</h3>
          </div>
          <p className="text-sm text-warnorange-700 mb-4">
            请先返回引导页上传材料，或使用内置演示数据开始体验。
          </p>
          <button
            onClick={() => {
              useRecordsStore.getState().loadMock();
            }}
            className="eng-btn-warning w-full py-2"
          >
            <PlayCircle className="w-4 h-4" />
            加载演示数据
          </button>
        </div>
      )}
    </aside>
  );
}

export default function WorkbenchPage() {
  const allRecords = useRecordsStore((s) => s.records);
  const filter = useFilterCondition();

  const filteredRecords = useMemo(() => {
    const condition = {
      timeStart: filter.timeStart,
      timeEnd: filter.timeEnd,
      zones: filter.zones,
      riskLevels: filter.riskLevels,
      recordTypes: filter.recordTypes,
      searchKeyword: filter.searchKeyword,
    };
    return applyFilter(allRecords, condition);
  }, [
    allRecords,
    filter.timeStart,
    filter.timeEnd,
    filter.zones,
    filter.riskLevels,
    filter.recordTypes,
    filter.searchKeyword,
  ]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_300px] gap-5">
      <FilterPanel />

      <main className="space-y-6 min-w-0">
        <TraceSection records={filteredRecords} />
        <RecordsTable records={filteredRecords} />
      </main>

      <ProcessingPanel
        totalCount={allRecords.length}
        filteredCount={filteredRecords.length}
      />
    </div>
  );
}
