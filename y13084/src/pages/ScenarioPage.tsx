import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronRight,
  ChevronLeft,
  List,
  AlertTriangle,
  Clock,
  MapPin,
  Box,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Hash,
} from "lucide-react";
import ThreeScene from "@/components/ThreeScene";
import {
  useRecordsStore,
  useTimelineStore,
  useScene3DStore,
  useShallow,
} from "@/store";
import { segmentTimeline } from "@/utils/processing";
import { MOCK_SCHEMES } from "@/data/mockData";
import {
  RISK_LEVEL_LABEL,
  RISK_LEVEL_COLOR,
  ZONE_LABEL,
  RECORD_TYPE_LABEL,
  type SensorRecord,
  type TimelineSegment,
  type RiskLevel,
  type WarehouseScheme,
} from "@/types";
import { cn } from "@/lib/utils";

const SEGMENT_RISK_COLORS: Record<RiskLevel, string> = {
  low: "from-emerald-500/60 to-emerald-600/60",
  medium: "from-amber-500/60 to-amber-600/60",
  high: "from-orange-500/60 to-orange-600/60",
  critical: "from-red-600/70 to-red-700/70",
};

function Timeline() {
  const records = useRecordsStore((s) => s.records);
  const { currentSegmentId, setCurrentSegmentId } = useTimelineStore(
    useShallow((s) => ({
      currentSegmentId: s.currentSegmentId,
      setCurrentSegmentId: s.setCurrentSegmentId,
    })),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderPos, setSliderPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<number | null>(null);

  const segments = useMemo<TimelineSegment[]>(() => {
    return segmentTimeline(records, 6);
  }, [records]);

  const segmentsWithRisk = useMemo(() => {
    return segments.map((seg) => {
      const segRecords = records.filter((r) => {
        const t = new Date(r.timestamp).getTime();
        const s = new Date(seg.start).getTime();
        const e = new Date(seg.end).getTime();
        return t >= s && t <= e;
      });
      const risks: Record<RiskLevel, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
      segRecords.forEach((r) => {
        risks[r.riskLevel]++;
      });
      const topRisk: RiskLevel =
        risks.critical > 0
          ? "critical"
          : risks.high > 0
            ? "high"
            : risks.medium > 0
              ? "medium"
              : "low";
      return { ...seg, records: segRecords, risks, topRisk };
    });
  }, [segments, records]);

  const currentIndex = useMemo(() => {
    const idx = segments.findIndex((s) => s.id === currentSegmentId);
    return idx >= 0 ? idx : 0;
  }, [segments, currentSegmentId]);

  useEffect(() => {
    if (segments.length > 0 && !currentSegmentId) {
      setCurrentSegmentId(segments[0].id);
    }
  }, [segments, currentSegmentId, setCurrentSegmentId]);

  useEffect(() => {
    if (segments.length === 0) return;
    const base = 100 / segments.length;
    setSliderPos(currentIndex * base + base / 2);
  }, [currentIndex, segments.length]);

  const snapToNearestSegment = useCallback(
    (pos: number) => {
      if (segments.length === 0) return 0;
      const base = 100 / segments.length;
      const idx = Math.min(
        segments.length - 1,
        Math.max(0, Math.floor(pos / base)),
      );
      return idx;
    },
    [segments],
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pos = ((e.clientX - rect.left) / rect.width) * 100;
      const idx = snapToNearestSegment(pos);
      if (segments[idx]) {
        setCurrentSegmentId(segments[idx].id);
      }
    },
    [snapToNearestSegment, segments, setCurrentSegmentId],
  );

  const handleSliderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      setIsPlaying(false);
    },
    [],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pos = Math.min(
        100,
        Math.max(0, ((e.clientX - rect.left) / rect.width) * 100),
      );
      const base = 100 / (segments.length || 1);
      setSliderPos(Math.min(100 - base / 2, Math.max(base / 2, pos)));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pos = ((e.clientX - rect.left) / rect.width) * 100;
      const idx = snapToNearestSegment(pos);
      if (segments[idx]) {
        setCurrentSegmentId(segments[idx].id);
      }
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, snapToNearestSegment, segments, setCurrentSegmentId]);

  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) {
        window.clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
      return;
    }
    playTimerRef.current = window.setInterval(() => {
      const nextIdx = (currentIndex + 1) % segments.length;
      setCurrentSegmentId(segments[nextIdx].id);
    }, 3500);
    return () => {
      if (playTimerRef.current) {
        window.clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, currentIndex, segments, setCurrentSegmentId]);

  const goPrev = () => {
    const prevIdx = (currentIndex - 1 + segments.length) % segments.length;
    if (segments[prevIdx]) setCurrentSegmentId(segments[prevIdx].id);
  };

  const goNext = () => {
    const nextIdx = (currentIndex + 1) % segments.length;
    if (segments[nextIdx]) setCurrentSegmentId(segments[nextIdx].id);
  };

  return (
    <div className="eng-card px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-deepsea-600" />
          <h3 className="font-bold text-deepsea-900 text-sm">时间轴</h3>
          <span className="text-xs text-deepsea-500">
            {segments.length > 0 ? segments[currentIndex]?.label : "暂无数据"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="eng-btn-ghost p-1.5 rounded-lg text-deepsea-600 hover:bg-deepsea-50"
            title="上一段"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "eng-btn-ghost p-1.5 rounded-lg transition-all",
              isPlaying
                ? "bg-deepsea-500 text-white hover:bg-deepsea-600"
                : "text-deepsea-600 hover:bg-deepsea-50",
            )}
            title={isPlaying ? "暂停" : "播放"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={goNext}
            className="eng-btn-ghost p-1.5 rounded-lg text-deepsea-600 hover:bg-deepsea-50"
            title="下一段"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div
            ref={trackRef}
            onClick={handleTrackClick}
            className="relative h-12 rounded-lg overflow-hidden cursor-pointer select-none"
          >
            <div className="absolute inset-0 flex">
              {segmentsWithRisk.map((seg, idx) => {
                const isActive = idx === currentIndex;
                const hasHighlight = seg.highlight;
                return (
                  <div
                    key={seg.id}
                    className={cn(
                      "relative flex-1 border-r border-white/10 last:border-r-0",
                      "transition-all duration-300",
                      isActive ? "" : "opacity-70",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-b",
                        SEGMENT_RISK_COLORS[seg.topRisk],
                        "transition-opacity duration-300",
                      )}
                    />
                    {hasHighlight && (
                      <div className="absolute inset-x-0 top-0 h-1 bg-red-500 animate-pulse" />
                    )}
                    {isActive && (
                      <>
                        <div className="absolute inset-0 ring-2 ring-white/60 ring-inset z-10 rounded-sm" />
                        <div className="absolute inset-0 bg-white/10 animate-pulse z-0" />
                      </>
                    )}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
                      <span
                        className={cn(
                          "text-[10px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded",
                          isActive
                            ? "bg-white/95 text-deepsea-900 shadow-sm"
                            : "text-white/90",
                        )}
                      >
                        {idx + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                "absolute top-0 bottom-0 w-0.5 bg-white shadow-lg shadow-black/30 z-30",
                "pointer-events-none",
                isDragging ? "scale-y-110" : "transition-all duration-200",
              )}
              style={{ left: `${sliderPos}%` }}
            >
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-deepsea-500"
                onMouseDown={handleSliderMouseDown}
                style={{ pointerEvents: "auto" }}
              />
            </div>
          </div>

          <div className="flex justify-between mt-1.5 px-0.5">
            {segments.map((seg, idx) => (
              <div
                key={seg.id}
                className={cn(
                  "text-[10px] text-deepsea-500 truncate",
                  idx === currentIndex
                    ? "text-deepsea-800 font-semibold"
                    : "",
                )}
                style={{ width: `${100 / segments.length}%` }}
              >
                <span className="block truncate">
                  {seg.label.split(" ~ ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          {(["critical", "high", "medium", "low"] as RiskLevel[]).map((r) => (
            <div key={r} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-3 h-3 rounded-sm",
                  RISK_LEVEL_COLOR[r],
                )}
              />
              <span className="text-[10px] text-deepsea-500">
                {RISK_LEVEL_LABEL[r]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecordRow({
  record,
  index,
  isHighlighted,
  onToggle,
}: {
  record: SensorRecord;
  index: number;
  isHighlighted: boolean;
  onToggle: (id: string) => void;
}) {
  const setCameraTarget = useScene3DStore((s) => s.setCameraTarget);

  const handleClick = () => {
    onToggle(record.id);
    const scheme = MOCK_SCHEMES.find((s: WarehouseScheme) => s.zone === record.zone);
    if (scheme) {
      setCameraTarget({
        x: scheme.position.x,
        y: 5,
        z: scheme.position.z,
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all group",
        isHighlighted
          ? "bg-deepsea-500/10 border-deepsea-400 ring-2 ring-deepsea-400/30"
          : "bg-white border-deepsea-100 hover:border-deepsea-300 hover:bg-deepsea-50/50",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
          <div
            className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold",
              isHighlighted
                ? "bg-deepsea-500 text-white"
                : "bg-deepsea-100 text-deepsea-600 group-hover:bg-deepsea-200",
            )}
          >
            {index + 1}
          </div>
          <Radio
            className={cn(
              "w-3 h-3",
              isHighlighted ? "text-deepsea-500" : "text-deepsea-300",
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-deepsea-500">
              {record.timestamp.slice(5, 16).replace("T", " ")}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white",
                RISK_LEVEL_COLOR[record.riskLevel],
              )}
            >
              {RISK_LEVEL_LABEL[record.riskLevel]}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                "bg-deepsea-100 text-deepsea-700",
              )}
            >
              <MapPin className="w-2.5 h-2.5" />
              {ZONE_LABEL[record.zone].split("-")[0]}
            </span>
          </div>
          <p className="text-xs text-deepsea-700 leading-relaxed line-clamp-2">
            {record.description}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-deepsea-400">
            <span className="inline-flex items-center gap-1">
              <Hash className="w-3 h-3" />
              行 {record.sourceRow}
            </span>
            <span>{RECORD_TYPE_LABEL[record.recordType]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordsPanel() {
  const records = useRecordsStore((s) => s.records);
  const currentSegmentId = useTimelineStore((s) => s.currentSegmentId);
  const {
    highlightedRecordIds,
    toggleHighlightedRecordId,
    clearHighlightedRecordIds,
  } = useScene3DStore(
    useShallow((s) => ({
      highlightedRecordIds: s.highlightedRecordIds,
      toggleHighlightedRecordId: s.toggleHighlightedRecordId,
      clearHighlightedRecordIds: s.clearHighlightedRecordIds,
    })),
  );
  const [collapsed, setCollapsed] = useState(false);
  const segments = useMemo(() => segmentTimeline(records, 6), [records]);

  const segmentRecords = useMemo(() => {
    const seg = segments.find((s) => s.id === currentSegmentId);
    if (!seg) return [] as SensorRecord[];
    const s = new Date(seg.start).getTime();
    const e = new Date(seg.end).getTime();
    return records.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= s && t <= e;
    });
  }, [records, segments, currentSegmentId]);

  const sortedRecords = useMemo(() => {
    const order: Record<RiskLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return [...segmentRecords].sort(
      (a, b) => order[a.riskLevel] - order[b.riskLevel],
    );
  }, [segmentRecords]);

  const stats = useMemo(() => {
    const s = { critical: 0, high: 0, medium: 0, low: 0 };
    segmentRecords.forEach((r) => s[r.riskLevel]++);
    return s;
  }, [segmentRecords]);

  return (
    <div
      className={cn(
        "eng-card flex flex-col transition-all duration-300 overflow-hidden",
        collapsed ? "w-12" : "w-[340px]",
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-3 border-b border-deepsea-100 hover:bg-deepsea-50/50 transition-colors shrink-0"
      >
        {collapsed ? (
          <div className="w-full flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-deepsea-500" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <List className="w-4.5 h-4.5 text-deepsea-600" />
              <span className="font-bold text-deepsea-900 text-sm">
                传感器记录
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-deepsea-100 text-deepsea-700 text-xs font-medium">
                {segmentRecords.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {highlightedRecordIds.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHighlightedRecordIds();
                  }}
                  className="text-[10px] text-deepsea-500 hover:text-red-500 transition-colors"
                >
                  清除高亮
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-deepsea-400" />
            </div>
          </>
        )}
      </button>

      {!collapsed && (
        <>
          <div className="px-4 py-2.5 border-b border-deepsea-100 bg-deepsea-50/30 shrink-0">
            <div className="grid grid-cols-4 gap-1.5">
              {(["critical", "high", "medium", "low"] as RiskLevel[]).map(
                (r) => (
                  <div
                    key={r}
                    className="flex flex-col items-center gap-0.5 py-1 rounded-md bg-white/60"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        RISK_LEVEL_COLOR[r],
                      )}
                    />
                    <span className="text-xs font-bold text-deepsea-800">
                      {stats[r]}
                    </span>
                    <span className="text-[9px] text-deepsea-400">
                      {RISK_LEVEL_LABEL[r].slice(0, 1)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {sortedRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-deepsea-400">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">当前时段无记录</p>
              </div>
            ) : (
              sortedRecords.map((r, idx) => (
                <RecordRow
                  key={r.id}
                  record={r}
                  index={idx}
                  isHighlighted={highlightedRecordIds.includes(r.id)}
                  onToggle={toggleHighlightedRecordId}
                />
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-deepsea-100 shrink-0">
            <p className="text-[10px] text-deepsea-400 text-center">
              点击记录高亮3D场景对应区域
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function ScenarioPage() {
  const { loadMock, records } = useRecordsStore(
    useShallow((s) => ({
      loadMock: s.loadMock,
      records: s.records,
    })),
  );
  const selectedSchemeId = useScene3DStore((s) => s.selectedSchemeId);

  useEffect(() => {
    if (records.length === 0) {
      loadMock();
    }
  }, [records.length, loadMock]);

  const selectedScheme = MOCK_SCHEMES.find(
    (s: WarehouseScheme) => s.id === selectedSchemeId,
  );

  return (
    <div className="flex flex-col h-[calc(100vh-116px)] min-h-[600px] gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-deepsea-600" />
            <h2 className="text-xl font-bold text-deepsea-900">3D 场景可视化</h2>
          </div>
          {selectedScheme && (
            <div className="eng-card px-3 py-1.5 flex items-center gap-2 animate-in fade-in">
              <span className="text-xs text-deepsea-500">已选方案</span>
              <span className="text-sm font-bold text-deepsea-800">
                {selectedScheme.name}
              </span>
            </div>
          )}
        </div>
        <div className="text-xs text-deepsea-500">
          提示：拖动旋转 · 滚轮缩放 · 悬停查看详情 · 点击选择方案
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 eng-card overflow-hidden relative min-w-0">
          <ThreeScene />
          <div className="absolute top-4 left-4 space-y-2 pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs text-white/90">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="font-medium">A区 · 近码头前沿</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-medium">B区 · 中部堆场</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium">C区 · 远岸后方</span>
              </div>
            </div>
            <div className="bg-slate-900/60 backdrop-blur rounded-lg px-3 py-1.5 text-[10px] text-white/70">
              线框球体 = 50m 安全距离
            </div>
          </div>
        </div>
        <RecordsPanel />
      </div>

      <Timeline />
    </div>
  );
}
