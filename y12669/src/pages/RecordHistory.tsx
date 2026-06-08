import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format as formatDate, parseISO } from "date-fns";
import { Play, Pause, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { useRecordsStore } from "@/store/useRecordsStore";

import type { Record as RecordData, RecordHistory, HistoryChange } from "../../shared/types";
import { cn } from "@/lib/utils";

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") return String(value);
  return value;
}

function isNumericValue(value: string | number | boolean | null | undefined): value is number {
  return typeof value === "number";
}

function compareNumeric(
  oldVal: string | number | boolean | null,
  newVal: string | number | boolean | null
): "up" | "down" | null {
  if (isNumericValue(oldVal) && isNumericValue(newVal)) {
    if (newVal > oldVal) return "up";
    if (newVal < oldVal) return "down";
  }
  return null;
}

interface SnapshotData {
  timeParameter: string;
  riskNote: string;
  ropeAngle: number;
  ropeLength: number;
  ropeTension: number;
  status: RecordData["status"];
}

function buildSnapshot(
  record: RecordData,
  history: RecordHistory[],
  versionIndex: number
): SnapshotData {
  const snapshot: SnapshotData = {
    timeParameter: record.timeParameter,
    riskNote: record.riskNote,
    ropeAngle: record.ropeAngle,
    ropeLength: record.ropeLength,
    ropeTension: record.ropeTension,
    status: record.status,
  };

  if (history.length === 0) return snapshot;

  const sorted = [...history].sort((a, b) => a.version - b.version);
  const maxIdx = Math.min(versionIndex, sorted.length - 1);

  for (let i = 0; i <= maxIdx; i++) {
    const h = sorted[i];
    h.changes.forEach((c) => {
      const key = c.field as keyof SnapshotData;
      if (key in snapshot && c.newValue !== null && c.newValue !== undefined) {
        (snapshot as unknown as Record<string, unknown>)[key] = c.newValue;
      }
    });
  }

  return snapshot;
}

export default function RecordHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedRecord, recordHistory, loading, fetchRecord, fetchHistory } =
    useRecordsStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<number | null>(null);

  const sortedHistory = useMemo(
    () => [...recordHistory].sort((a, b) => a.version - b.version),
    [recordHistory]
  );

  useEffect(() => {
    if (id) {
      fetchRecord(id);
      fetchHistory(id);
    }
    return () => {
      if (playTimerRef.current) {
        window.clearInterval(playTimerRef.current);
      }
    };
  }, [id, fetchRecord, fetchHistory]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [sortedHistory.length]);

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }
    if (sortedHistory.length <= 1) return;

    playTimerRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= sortedHistory.length - 1) return 0;
        return prev + 1;
      });
    }, 2000);

    return () => {
      if (playTimerRef.current) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [isPlaying, sortedHistory.length]);

  const currentVersion = sortedHistory[currentIndex];
  const snapshot = useMemo<SnapshotData | null>(() => {
    if (!selectedRecord) return null;
    return buildSnapshot(selectedRecord, sortedHistory, currentIndex);
  }, [selectedRecord, sortedHistory, currentIndex]);

  const togglePlay = () => {
    if (sortedHistory.length <= 1) return;
    setIsPlaying((p) => !p);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const renderChangeItem = (change: HistoryChange) => {
    const trend = compareNumeric(change.oldValue, change.newValue);
    return (
      <div
        key={change.field}
        className="py-2 first:pt-0 last:pb-0 border-b border-slate-100 last:border-b-0"
      >
        <div className="text-xs font-medium text-slate-700 mb-1">
          {change.fieldLabel}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono">
            {formatValue(change.oldValue)}
          </span>
          <span className="text-slate-400">→</span>
          <span
            className={cn(
              "px-2 py-1 rounded font-mono font-semibold",
              trend === "up"
                ? "bg-danger-50 text-danger-700"
                : trend === "down"
                ? "bg-success-50 text-success-700"
                : "bg-primary-50 text-primary-700"
            )}
          >
            {formatValue(change.newValue)}
            {trend === "up" && (
              <ArrowUp className="inline w-3 h-3 ml-0.5 -mt-0.5" />
            )}
            {trend === "down" && (
              <ArrowDown className="inline w-3 h-3 ml-0.5 -mt-0.5" />
            )}
          </span>
        </div>
      </div>
    );
  };

  const renderSnapshotRow = (
    label: string,
    value: string | number,
    unit?: string,
    compareVal?: string | number
  ) => {
    let trend: "up" | "down" | null = null;
    if (
      compareVal !== undefined &&
      typeof value === "number" &&
      typeof compareVal === "number"
    ) {
      trend = compareNumeric(compareVal, value);
    }
    return (
      <div className="detail-row">
        <span className="detail-label">{label}</span>
        <span className="detail-value flex items-center gap-1">
          {value}
          {unit && <span className="text-slate-400 font-normal">{unit}</span>}
          {trend === "up" && (
            <ArrowUp className="w-3.5 h-3.5 text-danger-500" />
          )}
          {trend === "down" && (
            <ArrowDown className="w-3.5 h-3.5 text-success-500" />
          )}
        </span>
      </div>
    );
  };

  if (!selectedRecord) {
    return (
      <div className="p-8 text-center text-slate-500">
        {loading ? "加载中..." : "未找到记录"}
      </div>
    );
  }

  const prevSnapshot =
    currentIndex > 0
      ? buildSnapshot(selectedRecord, sortedHistory, currentIndex - 1)
      : null;

  return (
    <div className="p-6">
      <PageHeader
        title="历史追溯"
        description="查看记录的每一次修改，支持时间回放"
        actions={
          <button type="button" className="btn-secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        }
      />

      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={togglePlay}
              disabled={sortedHistory.length <= 1}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all",
                sortedHistory.length <= 1
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : isPlaying
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200"
              )}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>
            <div>
              <div className="text-xs text-slate-500">当前版本</div>
              <div className="text-xl font-bold text-slate-900">
                {currentVersion ? `V${currentVersion.version}` : "V1"}
                <span className="text-sm font-normal text-slate-400 ml-2">
                  / 共 {Math.max(sortedHistory.length, 1)} 个版本
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            <input
              type="range"
              min={0}
              max={Math.max(sortedHistory.length - 1, 0)}
              step={1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="w-full accent-primary-600"
              disabled={sortedHistory.length <= 1}
            />
            {sortedHistory.length > 1 && (
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>V{sortedHistory[0]?.version ?? 1}</span>
                <span>
                  V{sortedHistory[sortedHistory.length - 1]?.version ?? 1}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {sortedHistory.length === 0 && (
                <div className="card p-5 border-l-4 border-primary-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-900">
                      V1 · 初版
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">
                    {selectedRecord.operator}
                  </div>
                  <div className="text-xs text-slate-400 mb-3">
                    {formatDate(
                      parseISO(selectedRecord.createdAt),
                      "yyyy-MM-dd HH:mm:ss"
                    )}
                  </div>
                  <p className="text-sm text-slate-600">初始创建记录</p>
                </div>
              )}
              {sortedHistory.map((h, idx) => (
                <div
                  key={h.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "card p-5 relative cursor-pointer transition-all",
                    idx === currentIndex
                      ? "border-l-4 border-primary-500 shadow-card-hover"
                      : "hover:shadow-card-hover border-l-4 border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "absolute -left-[7px] top-5 w-3.5 h-3.5 rounded-full border-2",
                      idx === currentIndex
                        ? "bg-primary-500 border-primary-500"
                        : "bg-white border-slate-300"
                    )}
                  />
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-900">
                      V{h.version}
                      {idx === 0 && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 font-normal">
                          初版
                        </span>
                      )}
                      {idx === sortedHistory.length - 1 &&
                        sortedHistory.length > 1 && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-success-50 text-success-600 font-normal">
                            最新
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">
                    {h.operator}
                  </div>
                  <div className="text-xs text-slate-400 mb-3">
                    {formatDate(parseISO(h.operatedAt), "yyyy-MM-dd HH:mm:ss")}
                  </div>
                  {h.comment && (
                    <p className="text-sm text-slate-700 mb-3 p-2.5 rounded-lg bg-slate-50">
                      {h.comment}
                    </p>
                  )}
                  <div className="space-y-0">
                    {h.changes.map(renderChangeItem)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full bg-primary-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                状态快照 ·{" "}
                {currentVersion ? `V${currentVersion.version}` : "V1"}
              </h3>
              {currentVersion && (
                <span className="text-xs text-slate-400 ml-auto">
                  {formatDate(
                    parseISO(currentVersion.operatedAt),
                    "yyyy-MM-dd HH:mm:ss"
                  )}
                </span>
              )}
            </div>

            {snapshot && (
              <div>
                <div className="detail-row">
                  <span className="detail-label">时间参数</span>
                  <span className="detail-value">
                    {formatDate(
                      parseISO(snapshot.timeParameter),
                      "yyyy-MM-dd HH:mm:ss"
                    )}
                  </span>
                </div>

                <div className="py-2.5 border-b border-slate-50">
                  <div className="text-sm text-slate-500 mb-1.5">风险备注</div>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {snapshot.riskNote || (
                      <span className="text-slate-400">（空）</span>
                    )}
                  </p>
                </div>

                {renderSnapshotRow(
                  "绳索角度",
                  snapshot.ropeAngle,
                  "°",
                  prevSnapshot?.ropeAngle
                )}
                {renderSnapshotRow(
                  "绳索长度",
                  snapshot.ropeLength,
                  "m",
                  prevSnapshot?.ropeLength
                )}
                {renderSnapshotRow(
                  "绳索张力",
                  snapshot.ropeTension,
                  "kgf",
                  prevSnapshot?.ropeTension
                )}

                <div className="detail-row">
                  <span className="detail-label">状态</span>
                  <StatusBadge status={snapshot.status} />
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-2">
                    版本说明
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed p-3 rounded-lg bg-slate-50">
                    {currentVersion?.comment ||
                      (currentIndex === 0
                        ? "这是该记录的初始版本，包含首次录入的所有参数。"
                        : "该版本无额外备注。")}
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500 mb-2">
                    操作信息
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slate-400">操作人</div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {currentVersion?.operator ?? selectedRecord.operator}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">操作时间</div>
                      <div className="text-slate-800 font-medium mt-0.5">
                        {formatDate(
                          parseISO(
                            currentVersion?.operatedAt ??
                              selectedRecord.createdAt
                          ),
                          "yyyy-MM-dd HH:mm:ss"
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
