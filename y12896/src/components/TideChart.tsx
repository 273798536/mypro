import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  BarController,
  BarElement,
} from "chart.js";
import type { TimelinePoint, TidePoint } from "~/shared/types";
import { formatTime } from "@/lib/format";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  BarController,
  BarElement
);

interface Props {
  tides?: TidePoint[];
  timeline?: TimelinePoint[];
  highlightIndex?: number;
  compact?: boolean;
}

export default function TideChart({ tides, timeline, highlightIndex, compact }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const data = timeline && timeline.length > 0 ? timeline : tides;
    if (!data || data.length === 0) return;

    const labels = data.map((d) => formatTime(d.time));
    const tideLevels = data.map((d) => ("tideLevel" in d ? d.tideLevel : 0));
    const reservoirLevels = timeline
      ? timeline.map((t) => t.reservoirLevel)
      : undefined;
    const power = timeline
      ? timeline.map((t) => (t.power > 0 ? t.power / 20 : null))
      : undefined;

    const bgGradients: string[] = [];
    const phases = timeline ? timeline.map((t) => t.phase) : (tides?.map((t) => t.phase) as string[]);
    for (const p of phases) {
      if (p === "falling" || p === "generating") bgGradients.push("rgba(0, 201, 167, 0.08)");
      else if (p === "rising" || p === "storing") bgGradients.push("rgba(59, 130, 185, 0.12)");
      else if (p === "discarding") bgGradients.push("rgba(255, 107, 53, 0.15)");
      else bgGradients.push("rgba(111, 168, 205, 0.06)");
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "海水潮位 (m)",
            data: tideLevels,
            borderColor: "#3B82B9",
            backgroundColor: function (ctx: any) {
              const i = ctx.dataIndex;
              return bgGradients[i] || "rgba(59, 130, 185, 0.1)";
            },
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: "#00C9A7",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
          },
          ...(reservoirLevels
            ? [
                {
                  label: "水库水位 (m)",
                  data: reservoirLevels,
                  borderColor: "#00C9A7",
                  backgroundColor: "rgba(0, 201, 167, 0.15)",
                  borderWidth: 2,
                  borderDash: [6, 3],
                  fill: false,
                  tension: 0.35,
                  pointRadius: 0,
                },
              ]
            : []),
          ...(power
            ? [
                {
                  label: "发电功率 (×20 kW)",
                  data: power,
                  borderColor: "#FFB703",
                  backgroundColor: "rgba(255, 183, 3, 0.4)",
                  borderWidth: 1.5,
                  type: "bar" as const,
                  order: 10,
                  barPercentage: 0.6,
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: compact ? false : true,
        aspectRatio: compact ? undefined : 2.6,
        animation: { duration: 600, easing: "easeOutQuart" },
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              color: "#B3CDE3",
              font: { family: "Noto Sans SC", size: 11, weight: 500 as const },
              padding: 16,
              boxWidth: 14,
              boxHeight: 10,
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: "rgba(6, 22, 41, 0.95)",
            titleColor: "#fff",
            bodyColor: "#D9E6F1",
            borderColor: "rgba(0, 201, 167, 0.3)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: "Noto Sans SC", size: 13 },
            bodyFont: { family: "JetBrains Mono", size: 12 },
          },
        },
        scales: {
          x: {
            grid: {
              color: "rgba(111, 168, 205, 0.08)",
            },
            ticks: {
              color: "#6FA8CD",
              font: { family: "JetBrains Mono", size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: compact ? 8 : 12,
            },
          },
          y: {
            beginAtZero: false,
            min: 0,
            max: 5.5,
            grid: {
              color: "rgba(111, 168, 205, 0.08)",
            },
            ticks: {
              color: "#6FA8CD",
              font: { family: "JetBrains Mono", size: 10 },
              callback: (v) => `${v}m`,
            },
            title: {
              display: !compact,
              text: "水位 / 功率",
              color: "#B3CDE3",
              font: { family: "Noto Sans SC", size: 11 },
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [tides, timeline, compact]);

  useEffect(() => {
    if (!chartRef.current || highlightIndex == null) return;
    const chart = chartRef.current;
    const meta = chart.getDatasetMeta(0);
    if (meta && meta.data && meta.data[highlightIndex]) {
      meta.data.forEach((pt: any, i) => {
        pt.options = pt.options || {};
        if (i === highlightIndex) {
          pt.options.radius = 8;
          pt.options.backgroundColor = "#FFB703";
          pt.options.borderColor = "#fff";
          pt.options.borderWidth = 3;
        } else {
          pt.options.radius = 0;
        }
      });
      chart.update("none");
    }
  }, [highlightIndex]);

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-ocean-800/60 to-ocean-900/40 border border-ocean-700/50 p-4 shadow-lg ${
        compact ? "" : "p-6"
      }`}
    >
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ocean-100">
            24小时潮汐水位 & 发电曲线
          </h3>
          <div className="flex gap-3 text-xs text-ocean-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ocean-400" />
              海水
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tide-green" />
              水库
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-tide-warning" />
              发电功率
            </span>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full" style={{ maxHeight: compact ? 260 : 380 }} />
    </div>
  );
}
