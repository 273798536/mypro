import { useState } from "react";
import { Play, Calendar, Layers, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onDetect: () => void;
}

export default function DetectionPanel({ onDetect }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [project, setProject] = useState("all");
  const [period, setPeriod] = useState("this-month");

  const handleStart = () => {
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p === null) return null;
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setProgress(null);
            onDetect();
          }, 400);
          return 100;
        }
        return p + 8;
      });
    }, 120);
  };

  const isRunning = progress !== null;

  return (
    <div className="eng-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ocean-600 font-song">
              <Layers className="mr-1 inline h-3 w-3" />
              项目范围
            </label>
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              disabled={isRunning}
              className="rounded border border-ocean-200 bg-white px-3 py-1.5 text-sm text-ocean-700 focus:border-ocean-500 focus:outline-none disabled:opacity-60"
            >
              <option value="all">全部项目</option>
              <option value="dh">东海深水网箱牧场</option>
              <option value="hh">黄海国家级海洋牧场</option>
              <option value="nh">南海深水抗风浪网箱</option>
              <option value="bh">渤海生态修复型牧场</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ocean-600 font-song">
              <Calendar className="mr-1 inline h-3 w-3" />
              检测时段
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={isRunning}
              className="rounded border border-ocean-200 bg-white px-3 py-1.5 text-sm text-ocean-700 focus:border-ocean-500 focus:outline-none disabled:opacity-60"
            >
              <option value="today">今日数据</option>
              <option value="this-week">本周</option>
              <option value="this-month">本月（推荐）</option>
              <option value="custom">自定义区间</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {progress !== null && (
            <div className="flex items-center gap-3">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-ocean-100">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-200",
                    progress >= 100 ? "bg-seaweed-500" : "bg-ocean-500"
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              {progress >= 100 ? (
                <span className="flex items-center gap-1 text-xs font-medium text-seaweed-600">
                  <CheckCircle2 className="h-4 w-4" />
                  检测完成
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-ocean-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  检测中 {progress}%
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleStart}
            disabled={isRunning}
            className="btn-primary disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? "检测中..." : "执行碰撞检测"}
          </button>
        </div>
      </div>
    </div>
  );
}
