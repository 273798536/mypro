import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, AlertTriangle, Clock, CheckCircle, Copy } from "lucide-react";
import { useNoiseStore } from "@/store/useNoiseStore";
import { SOURCE_TYPE_COLORS, SOURCE_TYPE_LABELS } from "@/types";
import type { NoiseSource, TimeRange } from "@/types";

function TimeCoverageGantt() {
  const noiseSources = useNoiseStore((s) => s.noiseSources);
  const enabledTypes = useNoiseStore((s) => s.enabledTypes);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const filteredSources = noiseSources.filter((s) => enabledTypes.has(s.type));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="mb-1 flex">
          <div className="w-28 shrink-0" />
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-gray-600">
              {h % 3 === 0 ? `${h}h` : ""}
            </div>
          ))}
        </div>
        {filteredSources.map((source) => {
          const color = SOURCE_TYPE_COLORS[source.type];
          const label = SOURCE_TYPE_LABELS[source.type];
          return (
            <div key={source.id} className="flex items-center">
              <div className="w-28 shrink-1 truncate text-xs text-gray-400">
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {source.name}
              </div>
              <div className="flex flex-1">
                {hours.map((h) => {
                  const isActive = source.timeRanges.some(
                    (tr) => h >= tr.startHour && h < tr.endHour
                  );
                  return (
                    <div
                      key={h}
                      className="flex-1 border border-gray-800/50"
                      style={{
                        backgroundColor: isActive ? `${color}44` : "transparent",
                        borderStyle: isActive ? "solid" : "dashed",
                        borderColor: isActive ? `${color}66` : "#374151",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded" style={{ backgroundColor: "#4a9eff44", border: "1px solid #4a9eff66" }} />
            有数据时段
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded border border-dashed border-gray-600" />
            无数据时段
          </span>
        </div>
      </div>
    </div>
  );
}

function ConflictTable() {
  const conflicts = useNoiseStore((s) => s.conflicts);

  if (conflicts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-900/20 px-4 py-3 text-sm text-green-400">
        <CheckCircle className="h-4 w-4" />
        无冲突，所有声源数据时段正常
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400">
            <th className="px-3 py-2 text-left text-xs font-medium">冲突类型</th>
            <th className="px-3 py-2 text-left text-xs font-medium">涉及声源</th>
            <th className="px-3 py-2 text-left text-xs font-medium">时段</th>
            <th className="px-3 py-2 text-left text-xs font-medium">修复建议</th>
          </tr>
        </thead>
        <tbody>
          {conflicts.map((conflict, i) => {
            const typeLabel =
              conflict.type === "time_mismatch"
                ? "时段错配"
                : conflict.type === "source_duplicate"
                ? "声源重复"
                : "楼层遮挡";
            const typeColor =
              conflict.type === "time_mismatch"
                ? "text-yellow-400"
                : conflict.type === "source_duplicate"
                ? "text-red-400"
                : "text-orange-400";
            return (
              <tr key={i} className="border-b border-gray-800/50 bg-red-900/10">
                <td className={`px-3 py-2 text-xs font-medium ${typeColor}`}>
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  {typeLabel}
                </td>
                <td className="px-3 py-2 text-xs text-gray-300">
                  {conflict.sources.join("、")}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {conflict.timeRange
                    ? `${conflict.timeRange.startHour}:00-${conflict.timeRange.endHour}:00`
                    : "-"}
                </td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {conflict.suggestion}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ImportRecordList() {
  const importRecords = useNoiseStore((s) => s.importRecords);

  return (
    <div className="flex flex-col gap-2">
      {importRecords.map((record) => {
        const statusIcon =
          record.status === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-400" />
          ) : record.status === "duplicate" ? (
            <Copy className="h-4 w-4 text-yellow-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-400" />
          );
        const statusLabel =
          record.status === "success"
            ? "成功"
            : record.status === "duplicate"
            ? "重复"
            : "冲突";
        const statusColor =
          record.status === "success"
            ? "text-green-400"
            : record.status === "duplicate"
            ? "text-yellow-400"
            : "text-red-400";

        return (
          <div
            key={record.id}
            className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
          >
            {statusIcon}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">{record.fileName}</span>
                <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(record.importedAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>
                  覆盖时段：{record.timeCoverage.map((tr) => `${tr.startHour}:00-${tr.endHour}:00`).join("、")}
                </span>
              </div>
              {record.conflictDetail && (
                <p className="mt-1 text-xs text-yellow-500">{record.conflictDetail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ImportPage() {
  const addNoiseSource = useNoiseStore((s) => s.addNoiseSource);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const newSource: NoiseSource = {
        id: `s-import-${Date.now()}`,
        type: "construction",
        name: `导入声源-${new Date().toLocaleTimeString("zh-CN")}`,
        position: [Math.random() * 60 - 30, 0.5, Math.random() * 40 - 20],
        baseLevel: 65 + Math.floor(Math.random() * 15),
        timeRanges: [
          { startHour: 8, endHour: 18, level: 70 },
        ],
        importedAt: Date.now(),
      };
      addNoiseSource(newSource);
    },
    [addNoiseSource]
  );

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0d1117] text-white">
      <header className="flex items-center gap-3 border-b border-gray-800 bg-gray-900/90 px-4 py-2">
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-lg bg-gray-700/60 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
          返回地图
        </Link>
        <h1 className="text-base font-bold">声源导入管理</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-1/2 flex-col border-r border-gray-800 p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-300">增量导入</h2>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`mb-6 flex h-40 items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
              isDragging
                ? "border-orange-500 bg-orange-500/10"
                : "border-gray-600 bg-gray-800/30"
            }`}
          >
            <div className="text-center">
              <Upload className="mx-auto mb-2 h-8 w-8 text-gray-500" />
              <p className="text-sm text-gray-400">拖拽文件到此处导入声源数据</p>
              <p className="mt-1 text-[10px] text-gray-600">支持 JSON / CSV 格式 · 先导入楼栋和道路声源，工地时段数据可后补</p>
            </div>
          </div>

          <h2 className="mb-3 text-sm font-semibold text-gray-300">时序标注</h2>
          <TimeCoverageGantt />
        </div>

        <div className="flex w-1/2 flex-col p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-300">冲突检测</h2>
          <div className="mb-6">
            <ConflictTable />
          </div>

          <h2 className="mb-3 text-sm font-semibold text-gray-300">导入记录</h2>
          <div className="flex-1 overflow-y-auto">
            <ImportRecordList />
          </div>
        </div>
      </div>
    </div>
  );
}
