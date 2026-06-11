import { useMemo, useState } from "react";
import {
  Activity,
  Anchor,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Droplets,
  Fish,
  Image as ImageIcon,
  Info,
  Layers,
  Link2,
  Thermometer,
  AlertTriangle,
} from "lucide-react";
import { useInspectionStore } from "@/store/inspectionStore";
import { ResultBadge } from "@/components/ResultBadge";
import { SectionTitle } from "@/components/FormulaCard";
import { PHOTO_PREV_URLS } from "@/data/mockData";

export default function WaterQualityAlert() {
  const { inspections } = useInspectionStore();
  const [expandedId, setExpandedId] = useState<string | null>("insp_20260612_001");

  const withWaterQuality = useMemo(
    () =>
      inspections
        .filter((i) => i.waterQualitySamples && i.waterQualitySamples.length > 0)
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [inspections],
  );

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto animate-slide-in-up">
      <SectionTitle
        title="水质预警 & 结论来源追溯"
        subtitle="每条结论都能一键回溯到原始监测记录、气象报告、现场照片；修改任一来源材料自动标记结论待复核"
        icon={<Droplets className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3 text-xs text-ocean-500">
            <Layers className="w-3.5 h-3.5" />
            共 {withWaterQuality.length} 条巡检 · {withWaterQuality.reduce(
              (acc, i) => acc + (i.conclusion ? 1 : 0),
              0,
            )} 条已出结论
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "pH 平均值",
            value: "8.12",
            hint: "正常 7.8-8.5",
            tone: "emerald",
            icon: Droplets,
          },
          {
            label: "溶解氧 DO",
            value: "7.27",
            hint: "mg/L · 合格",
            tone: "emerald",
            icon: Fish,
          },
          {
            label: "浊度 NTU",
            value: "4.30",
            hint: "近阈值 · 关注",
            tone: "amber",
            icon: CloudRain,
          },
          {
            label: "水温",
            value: "19.5",
            hint: "°C · 正常",
            tone: "ocean",
            icon: Thermometer,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            className="card p-4 animate-slide-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="text-xs text-ocean-500">{s.label}</div>
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center ${
                  s.tone === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : s.tone === "amber"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-ocean-50 text-ocean-600"
                }`}
              >
                <s.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-serif font-bold text-2xl text-ocean-800">
              {s.value}
            </div>
            <div className="text-[11px] text-ocean-500 mt-0.5">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {withWaterQuality.map((insp) => {
          const expanded = expandedId === insp.id;
          const samples = insp.waterQualitySamples ?? [];
          const conclusion = insp.conclusion;
          return (
            <div key={insp.id} className="card overflow-hidden card-hover">
              <button
                onClick={() => setExpandedId(expanded ? null : insp.id)}
                className="w-full flex items-start justify-between p-5 hover:bg-ocean-50/30 transition-colors text-left"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${
                      conclusion?.needsReview
                        ? "bg-amber-100 text-amber-700"
                        : "bg-ocean-100 text-ocean-700"
                    }`}
                  >
                    <Anchor className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-bold text-ocean-700">
                        {insp.code}
                      </span>
                      <ResultBadge availability={insp.availability} size="sm" />
                      {conclusion?.needsReview && (
                        <span className="chip bg-amber-100 text-amber-800 text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          结论待复核（来源材料已变更）
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-ocean-800 truncate">
                      {insp.ranchName} · {insp.date}
                    </div>
                    {conclusion && (
                      <div className="text-xs text-ocean-500 mt-1 line-clamp-1 max-w-2xl">
                        {conclusion.summary}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <div className="label mb-1">水质采样</div>
                    <div className="font-mono text-xs text-ocean-700">
                      {samples.length} 组数据
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-5 h-5 text-ocean-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-ocean-400 shrink-0" />
                  )}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-steel-100 bg-gradient-to-b from-ocean-50/30 to-white p-5 space-y-5 animate-slide-in-up">
                  {conclusion && (
                    <div className="rounded-lg border-2 border-ocean-200 bg-white overflow-hidden">
                      <div className="bg-ocean-800 px-4 py-2.5 flex items-center gap-2 text-white">
                        <Link2 className="w-4 h-4" />
                        <span className="font-serif font-semibold text-sm">
                          巡检结论
                        </span>
                        {conclusion.needsReview ? (
                          <span className="ml-auto chip bg-amber-400 text-ocean-900 text-[10px] shadow">
                            ⚠ 来源材料变动后未确认
                          </span>
                        ) : (
                          <span className="ml-auto chip bg-emerald-400 text-ocean-900 text-[10px] shadow">
                            已同步所有来源
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-steel-100">
                        <div className="p-4 space-y-2">
                          <div className="label">结论摘要</div>
                          <div className="text-sm text-ocean-800 leading-relaxed">
                            {conclusion.summary}
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="label">处置建议</div>
                          <div className="text-sm text-ocean-700 leading-relaxed">
                            {conclusion.recommendation}
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-parchment-50 border-t border-parchment-200">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 mb-2">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          结论来源材料（点击追溯）
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { kind: "PHOTO", id: "水质监测照片", source: PHOTO_PREV_URLS.B[0] },
                            { kind: "PHOTO", id: "水下观察照片", source: PHOTO_PREV_URLS.V1[2] },
                            { kind: "SAMPLE", id: "水质采样 wq_001_01" },
                            { kind: "METEO", id: "气象 meteo_20260612_06" },
                            { kind: "TRAJECTORY", id: "航迹 28 点" },
                          ].map((src, idx) => (
                            <SourceTag key={idx} kind={src.kind as any} id={src.id} image={src.source} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-ocean-600" />
                      <h3 className="font-semibold text-ocean-800 text-sm">
                        原始监测记录
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md border border-steel-100 overflow-hidden">
                        <div className="bg-steel-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ocean-500 border-b border-steel-100">
                          水质指标
                        </div>
                        <div className="divide-y divide-steel-100">
                          {samples.map((s) => (
                            <div key={s.id} className="grid grid-cols-4 text-xs">
                              <MetricCell label="pH" value={s.ph.toFixed(2)} status={s.ph >= 7.8 && s.ph <= 8.5 ? "ok" : "warn"} />
                              <MetricCell label="DO" value={`${s.dissolvedOxygen.toFixed(1)}`} status={s.dissolvedOxygen >= 5 ? "ok" : "bad"} />
                              <MetricCell label="浊度" value={`${s.turbidityNtu.toFixed(1)}`} status={s.turbidityNtu < 4 ? "ok" : s.turbidityNtu < 5 ? "warn" : "bad"} />
                              <MetricCell label="水温" value={`${s.temperatureC.toFixed(1)}°C`} status="ok" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-md border border-steel-100 overflow-hidden">
                        <div className="bg-steel-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ocean-500 border-b border-steel-100">
                          关联气象报告
                        </div>
                        <div className="divide-y divide-steel-100">
                          {(insp.meteoReports ?? []).map((m) => (
                            <div key={m.id} className="grid grid-cols-3 text-xs">
                              <MetricCell
                                label="风场"
                                value={`${m.windSpeedMs.toFixed(1)} m/s`}
                                status="ok"
                              />
                              <MetricCell
                                label="风向"
                                value={`${m.windDirectionDeg}°`}
                                status="ok"
                              />
                              <MetricCell
                                label="浪高"
                                value={`${m.waveHeightM} m`}
                                status="ok"
                              />
                            </div>
                          ))}
                          {(insp.meteoReports ?? []).length === 0 && (
                            <div className="px-4 py-3 text-center text-xs text-ocean-400">
                              无气象报告
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-ocean-600" />
                      <h3 className="font-semibold text-ocean-800 text-sm">
                        现场照片来源
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {insp.photos.slice(0, 3).map((p, idx) => (
                        <div
                          key={p.id}
                          className="rounded-md border border-steel-100 overflow-hidden bg-white hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="relative aspect-video bg-steel-50">
                            <img
                              src={p.url}
                              alt={p.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute bottom-1 right-1 chip bg-ocean-900/80 text-white text-[9px] backdrop-blur">
                              来源材料 #{idx + 1}
                            </div>
                          </div>
                          <div className="p-2">
                            <div className="text-[11px] text-ocean-600 line-clamp-2 leading-snug">
                              {p.caption}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg bg-parchment-50 border border-parchment-200 p-4 flex items-start gap-3 shadow-parchment animate-slide-in-up">
        <Info className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-900 leading-relaxed">
          <div className="font-semibold mb-0.5">联动机制说明</div>
          当「水质采样 / 气象报告 / 现场照片」任一来源材料被修改或替换后，对应结论卡片会自动标记为
          <span className="mx-1 chip bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
            待复核
          </span>
          。海事处视角将自动把该结论从「可直接使用」栏移至「待调度员复核」栏，直至确认无误。
        </div>
      </div>
    </div>
  );
}

function SourceTag({
  kind,
  id,
  image,
}: {
  kind: "PHOTO" | "SAMPLE" | "METEO" | "TRAJECTORY";
  id: string;
  image?: string;
}) {
  const map = {
    PHOTO: {
      icon: ImageIcon,
      cls: "bg-sky-50 text-sky-700 border-sky-200",
      label: "照片",
    },
    SAMPLE: {
      icon: Droplets,
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      label: "采样",
    },
    METEO: {
      icon: CloudRain,
      cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
      label: "气象",
    },
    TRAJECTORY: {
      icon: Activity,
      cls: "bg-ocean-50 text-ocean-700 border-ocean-200",
      label: "航迹",
    },
  } as const;
  const cfg = map[kind];
  return (
    <span
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium cursor-pointer hover:shadow-md transition-all relative ${cfg.cls}`}
    >
      <cfg.icon className="w-3 h-3" />
      <span className="text-[10px] opacity-70">[{cfg.label}]</span>
      <span>{id}</span>
      {image && (
        <div className="absolute z-20 left-0 -bottom-36 w-44 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 rounded-md border border-steel-200 overflow-hidden bg-white shadow-lg">
          <img src={image} alt="" className="w-full aspect-video object-cover" />
          <div className="px-2 py-1 text-[10px] text-ocean-500 font-mono">
            原始附件预览
          </div>
        </div>
      )}
    </span>
  );
}

function MetricCell({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ok" | "warn" | "bad";
}) {
  const tone = {
    ok: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-red-700",
  }[status];
  return (
    <div className="px-3 py-2.5 border-r border-steel-50 last:border-r-0">
      <div className="text-[10px] uppercase tracking-wider text-ocean-400 font-semibold mb-0.5">
        {label}
      </div>
      <div className={`font-mono font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
