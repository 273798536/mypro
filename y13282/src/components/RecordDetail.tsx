import { useState } from "react";
import {
  X,
  Image,
  MapPin,
  User,
  Clock,
  FileText,
  Link2,
  Database,
  AlertTriangle,
  GitMerge,
  Copy,
  Hash,
  CornerDownRight,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import {
  RecordStatusTag,
  IntersectionErrorTag,
  BadDataTag,
} from "./tags";

type TabKey = "basic" | "merge" | "baddata" | "related";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "basic", label: "基本信息", icon: <FileText className="w-3 h-3" /> },
  { key: "merge", label: "合并溯源", icon: <GitMerge className="w-3 h-3" /> },
  { key: "baddata", label: "坏数据说明", icon: <Database className="w-3 h-3" /> },
  { key: "related", label: "合错关联", icon: <Link2 className="w-3 h-3" /> },
];

export default function RecordDetail() {
  const {
    selectedRecordId,
    selectRecord,
    getRecordById,
    getBadDataForRecord,
    getDuplicateLinkFor,
    getIntersectionErrorsFor,
    getMergeHistoryForTarget,
    getMergeHistoryForSource,
  } = useAppStore();
  const [tab, setTab] = useState<TabKey>("basic");

  const record = selectedRecordId ? getRecordById(selectedRecordId) : undefined;
  if (!record) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-zinc-200">
        <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-800">记录详情</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
              <FileText className="w-7 h-7 text-zinc-400" />
            </div>
            <p className="text-sm font-bold text-zinc-700 mb-1">
              点击左侧记录查看详情
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              详情面板包含完整信息、合并溯源、坏数据定位、路口合错关联四部分，方便和社区同事核点位。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bad = getBadDataForRecord(record.id);
  const dup = getDuplicateLinkFor(record.id);
  const ies = getIntersectionErrorsFor(record.id);
  const mergeTarget = getMergeHistoryForTarget(record.id);
  const mergeSource = getMergeHistoryForSource(record.id);

  const originalSources = (() => {
    const mh = mergeTarget || mergeSource;
    if (!mh) return null;
    try {
      return JSON.parse(mh.original_sources_json) as Array<{
        id: string;
        reporter: string;
        title: string;
        description: string;
        original_row_ref: string;
      }>;
    } catch {
      return null;
    }
  })();

  return (
    <div className="h-full flex flex-col bg-white border-l border-zinc-200">
      <div className="px-4 py-3 border-b border-zinc-200 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-bold text-zinc-800 truncate flex-1">
              记录详情
            </h3>
            <button
              onClick={() => selectRecord(null)}
              className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <RecordStatusTag status={record.status} />
            {record.is_intersection_error && <IntersectionErrorTag small />}
            {bad.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-databad-200 bg-databad-50 text-databad-700 text-[10px] font-medium">
                <Database className="w-2.5 h-2.5" />
                坏数据{bad.length}项
              </span>
            )}
            {dup && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium">
                <Copy className="w-2.5 h-2.5" />
                重复于{dup.original_record_id.slice(-6)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 px-2 bg-zinc-50">
        {TABS.map((t) => {
          const disabled =
            (t.key === "merge" && !mergeTarget && !mergeSource) ||
            (t.key === "baddata" && bad.length === 0) ||
            (t.key === "related" && ies.length === 0);
          return (
            <button
              key={t.key}
              onClick={() => !disabled && setTab(t.key)}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium border-b-2 transition ${
                tab === t.key
                  ? "border-government-600 text-government-700"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              } ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {t.icon}
              {t.label}
              {t.key === "merge" && (mergeTarget || mergeSource) && (
                <span className="bg-government-100 text-government-700 rounded-full px-1.5 text-[9px]">
                  {originalSources?.length || 0}
                </span>
              )}
              {t.key === "baddata" && bad.length > 0 && (
                <span className="bg-databad-100 text-databad-700 rounded-full px-1.5 text-[9px]">
                  {bad.length}
                </span>
              )}
              {t.key === "related" && ies.length > 0 && (
                <span className="bg-warning-100 text-warning-700 rounded-full px-1.5 text-[9px]">
                  {ies.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "basic" && (
          <div className="p-4 space-y-4">
            {record.photo_url && (
              <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
                <img
                  src={record.photo_url}
                  alt={record.title}
                  className="w-full h-44 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="px-3 py-2 bg-zinc-50 flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <Image className="w-3 h-3" />
                    {record.complaint_source}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    指纹 {record.fingerprint}
                  </span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" /> 标题
              </p>
              <p className="text-sm font-bold text-zinc-800 leading-snug">
                {record.title}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                <CornerDownRight className="w-3 h-3" /> 情况描述
              </p>
              <div className="px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                {record.description || <span className="italic text-zinc-400">（无描述）</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "地点名称",
                  value: record.location_name,
                  icon: <MapPin className="w-3 h-3 text-government-500" />,
                },
                {
                  label: "路口描述",
                  value: record.intersection || "-",
                  icon: (
                    <AlertTriangle className="w-3 h-3 text-warning-500" />
                  ),
                },
                {
                  label: "投诉人",
                  value: record.reporter || "匿名",
                  icon: <User className="w-3 h-3 text-teal-500" />,
                },
                {
                  label: "投诉时间",
                  value: record.report_time?.slice(0, 16) || "-",
                  icon: <Clock className="w-3 h-3 text-zinc-500" />,
                },
              ].map((it) => (
                <div
                  key={it.label}
                  className="px-3 py-2 rounded-lg bg-white border border-zinc-100"
                >
                  <p className="text-[10px] text-zinc-500 mb-0.5 flex items-center gap-1">
                    {it.icon}
                    {it.label}
                  </p>
                  <p className="text-xs font-medium text-zinc-800 line-clamp-2">
                    {it.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="px-3 py-2 rounded-lg bg-white border border-zinc-100">
                <p className="text-[10px] text-zinc-500 mb-0.5">坐标 (lat, lng)</p>
                <p className="text-xs font-mono font-medium text-zinc-800">
                  {record.lat.toFixed(4)}, {record.lng.toFixed(4)}
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white border border-zinc-100">
                <p className="text-[10px] text-zinc-500 mb-0.5">来源渠道</p>
                <p className="text-xs font-medium text-zinc-800">
                  {record.complaint_source}
                </p>
              </div>
            </div>

            <div className="px-3 py-2.5 rounded-lg bg-gradient-to-br from-zinc-50 to-white border border-dashed border-zinc-300">
              <p className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
                <Database className="w-3 h-3" /> 原始行 / 对象引用
                <span className="ml-auto text-[9px] text-zinc-400">
                  导出CSV时同步带出
                </span>
              </p>
              <p className="text-xs font-mono text-zinc-700 break-all">
                {record.original_row_ref || "—"}
              </p>
            </div>
          </div>
        )}

        {tab === "merge" && (mergeTarget || mergeSource) && originalSources && (
          <div className="p-4 space-y-3">
            <div className="px-3 py-2.5 rounded-lg bg-government-50 border border-government-200">
              <p className="text-[11px] font-medium text-government-700 mb-0.5 flex items-center gap-1.5">
                <GitMerge className="w-3.5 h-3.5" />
                {mergeTarget
                  ? "本记录由以下原始说法合并而成"
                  : "本记录已被合并入其他记录"}
              </p>
              <p className="text-[10px] text-government-600">
                现场老师可逐条展开，和社区同事核点位对比原始说法
              </p>
            </div>
            {originalSources.map((s, idx) => (
              <details
                key={s.id}
                open={idx === 0}
                className="group rounded-lg border border-zinc-200 bg-white overflow-hidden"
              >
                <summary className="px-3 py-2.5 cursor-pointer list-none flex items-center justify-between bg-zinc-50 hover:bg-zinc-100 transition">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-government-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-zinc-800 line-clamp-1">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        投诉人：{s.reporter || "匿名"} · 源ID: {s.id.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-government-600 font-medium">
                    {idx === 0 ? "收起" : "展开原始说法"} ▾
                  </span>
                </summary>
                <div className="px-3 py-3 space-y-2 border-t border-zinc-100">
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">原始描述</p>
                    <blockquote className="pl-3 py-2 border-l-2 border-government-300 bg-zinc-50/60 text-xs text-zinc-700 italic leading-relaxed rounded-r">
                      {s.description || "（无）"}
                    </blockquote>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">
                      原始行/对象引用
                    </p>
                    <p className="text-[10px] font-mono text-zinc-700 px-2 py-1 rounded bg-zinc-100 break-all">
                      {s.original_row_ref}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}

        {tab === "baddata" && bad.length > 0 && (
          <div className="p-4 space-y-3">
            <div className="px-3 py-2.5 rounded-lg bg-databad-50 border border-databad-200">
              <p className="text-[11px] font-medium text-databad-700 mb-0.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                坏数据未带偏系统，每条均定位到原始行与具体对象
              </p>
              <p className="text-[10px] text-databad-600">
                共 {bad.length} 项标记，导出CSV时会自动增加对应列
              </p>
            </div>
            {bad.map((b) => (
              <div
                key={b.id}
                className="rounded-lg border border-databad-200 bg-white overflow-hidden"
              >
                <div className="px-3 py-2 bg-databad-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BadDataTag type={b.issue_type} />
                    <span className="text-xs font-bold text-zinc-800">
                      字段「{b.field_name}」
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">问题说明</p>
                    <p className="text-zinc-700">{b.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-1">原始值</p>
                      <p className="px-2 py-1 rounded bg-zinc-100 font-mono text-[11px] text-databad-700 break-all">
                        {b.raw_value || "（空）"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 mb-1">
                        原始行/对象引用
                      </p>
                      <p className="px-2 py-1 rounded bg-databad-50 font-mono text-[11px] text-databad-700 break-all">
                        {b.original_ref || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "related" && ies.length > 0 && (
          <div className="p-4 space-y-3">
            <div className="px-3 py-2.5 rounded-lg bg-warning-50 border border-warning-200">
              <p className="text-[11px] font-medium text-warning-700 mb-0.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                相邻路口合错关联记录（共{ies.length}组）
              </p>
              <p className="text-[10px] text-warning-600">
                筛选栏、列表行、详情面板、导出文件 <span className="font-bold underline">四处均已留痕</span>
              </p>
            </div>
            {ies.map((ie) => {
              const otherId =
                ie.record_a_id === record.id ? ie.record_b_id : ie.record_a_id;
              const other = getRecordById(otherId);
              return (
                <div
                  key={ie.id}
                  className="rounded-lg border-2 border-dashed border-warning-400 bg-warning-50/40 overflow-hidden"
                >
                  <div className="px-3 py-2 bg-warning-100/50 border-b border-dashed border-warning-300 flex items-center justify-between">
                    <IntersectionErrorTag small />
                    {ie.distance_meters > 0 && (
                      <span className="text-[10px] text-warning-700 font-medium">
                        相距约 {Math.round(ie.distance_meters)}m
                      </span>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] text-warning-700 font-medium mb-1">
                      合错说明
                    </p>
                    <p className="text-xs text-zinc-800 leading-relaxed">
                      {ie.description}
                    </p>
                    {other && (
                      <div
                        className="mt-2 p-2.5 rounded-md bg-white border border-zinc-200 cursor-pointer hover:bg-government-50 transition"
                        onClick={() => selectRecord(other.id)}
                      >
                        <p className="text-[10px] text-zinc-500 mb-0.5">
                          ↔ 关联的另一条记录（点击跳转）
                        </p>
                        <p className="text-xs font-bold text-government-700 line-clamp-1 mb-0.5">
                          {other.title}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {other.location_name} · {other.reporter || "匿名"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
