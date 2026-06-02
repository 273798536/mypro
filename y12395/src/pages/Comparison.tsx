import { useEffect, useState, useMemo } from "react";
import { Columns, Play, AlertTriangle, ArrowRightLeft, Shuffle } from "lucide-react";
import { useStore, DiffType } from "@/store";

const diffTypeConfig: Record<DiffType, { label: string; bgClass: string; icon: typeof AlertTriangle; tooltip: string }> = {
  alias: {
    label: "异名",
    bgClass: "bg-zhusha/15",
    icon: AlertTriangle,
    tooltip: "异名差异：同一指法在不同版本中名称不同",
  },
  misalignment: {
    label: "错位",
    bgClass: "bg-amber-100/80",
    icon: ArrowRightLeft,
    tooltip: "段落错位：内容顺序在不同版本中出现偏移",
  },
  mixing: {
    label: "混用",
    bgClass: "bg-purple-100/80",
    icon: Shuffle,
    tooltip: "版本混用：内容中出现了其他版本的片段",
  },
};

export default function Comparison() {
  const { materials, comparisonResult, comparisonLoading, fetchMaterials, runComparison } = useStore();
  const [leftVersion, setLeftVersion] = useState("");
  const [rightVersion, setRightVersion] = useState("");
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const versions = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => set.add(m.version));
    return Array.from(set).sort();
  }, [materials]);

  const handleCompare = () => {
    if (!leftVersion || !rightVersion) return;
    runComparison(leftVersion, rightVersion);
  };

  const leftLines = comparisonResult?.leftContent.split("\n") || [];
  const rightLines = comparisonResult?.rightContent.split("\n") || [];
  const diffMap = new Map<number, DiffType>();
  if (comparisonResult) {
    comparisonResult.diffs.forEach((d) => diffMap.set(d.lineIndex, d.diffType));
  }

  const maxLines = Math.max(leftLines.length, rightLines.length);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-mohei">版本对比</h2>
        <p className="text-sm text-gray-500 font-serif mt-1">
          对比不同版本间的指法差异
        </p>
      </div>

      <div className="bg-white rounded-md shadow-warm p-5 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 font-serif mb-1">左版本</label>
            <select
              value={leftVersion}
              onChange={(e) => setLeftVersion(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-xuanzhi/50 transition-all duration-200"
            >
              <option value="">选择版本...</option>
              {versions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 font-serif mb-1">右版本</label>
            <select
              value={rightVersion}
              onChange={(e) => setRightVersion(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-xuanzhi/50 transition-all duration-200"
            >
              <option value="">选择版本...</option>
              {versions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCompare}
            disabled={!leftVersion || !rightVersion || comparisonLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-gutong text-white hover:bg-gutong/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-serif text-sm"
          >
            <Play size={16} />
            开始对比
          </button>
        </div>
      </div>

      {comparisonResult && (
        <>
          <div className="flex items-center gap-6 mb-4 bg-white rounded-md shadow-warm px-5 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-zhusha" />
              <span className="font-serif text-sm text-mohei">
                异名 <strong className="text-zhusha">{comparisonResult.summary.aliasCount}</strong> 处
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRightLeft size={16} className="text-amber-600" />
              <span className="font-serif text-sm text-mohei">
                错位 <strong className="text-amber-600">{comparisonResult.summary.misalignmentCount}</strong> 处
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shuffle size={16} className="text-purple-600" />
              <span className="font-serif text-sm text-mohei">
                混用 <strong className="text-purple-600">{comparisonResult.summary.mixingCount}</strong> 处
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="bg-white rounded-t-md shadow-warm px-4 py-2 border-b border-gutong/10">
                <h4 className="font-serif text-sm font-semibold text-mohei flex items-center gap-2">
                  <Columns size={14} className="text-gutong" />
                  {comparisonResult.leftVersion}
                </h4>
              </div>
              <div className="bg-white rounded-b-md shadow-warm overflow-y-auto max-h-[60vh]">
                {leftLines.map((line, i) => {
                  const diffType = diffMap.get(i);
                  const config = diffType ? diffTypeConfig[diffType] : null;
                  return (
                    <div
                      key={i}
                      className={`px-4 py-1.5 text-sm font-serif border-b border-gray-50 flex items-start gap-2 transition-all duration-200 ${
                        config ? config.bgClass : ""
                      }`}
                      onMouseEnter={(e) => {
                        if (config) {
                          setTooltipContent(config.tooltip);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseLeave={() => setTooltipContent(null)}
                    >
                      <span className="text-gray-300 text-xs select-none w-6 shrink-0 text-right">{i + 1}</span>
                      <span className="text-mohei">{line || "\u00A0"}</span>
                      {config && (
                        <config.icon size={14} className="shrink-0 mt-0.5 text-gutong" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="bg-white rounded-t-md shadow-warm px-4 py-2 border-b border-gutong/10">
                <h4 className="font-serif text-sm font-semibold text-mohei flex items-center gap-2">
                  <Columns size={14} className="text-gutong" />
                  {comparisonResult.rightVersion}
                </h4>
              </div>
              <div className="bg-white rounded-b-md shadow-warm overflow-y-auto max-h-[60vh]">
                {rightLines.map((line, i) => {
                  const diffType = diffMap.get(i);
                  const config = diffType ? diffTypeConfig[diffType] : null;
                  return (
                    <div
                      key={i}
                      className={`px-4 py-1.5 text-sm font-serif border-b border-gray-50 flex items-start gap-2 transition-all duration-200 ${
                        config ? config.bgClass : ""
                      }`}
                      onMouseEnter={(e) => {
                        if (config) {
                          setTooltipContent(config.tooltip);
                          setTooltipPos({ x: e.clientX, y: e.clientY });
                        }
                      }}
                      onMouseLeave={() => setTooltipContent(null)}
                    >
                      <span className="text-gray-300 text-xs select-none w-6 shrink-0 text-right">{i + 1}</span>
                      <span className="text-mohei">{line || "\u00A0"}</span>
                      {config && (
                        <config.icon size={14} className="shrink-0 mt-0.5 text-gutong" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {!comparisonResult && !comparisonLoading && (
        <div className="text-center py-16">
          <Columns size={48} className="mx-auto text-gutong/30 mb-4" />
          <p className="text-gray-400 font-serif">选择两个版本后点击"开始对比"</p>
        </div>
      )}

      {comparisonLoading && (
        <div className="text-center py-16 text-gray-400 font-serif">
          对比分析中...
        </div>
      )}

      {tooltipContent && (
        <div
          className="fixed z-50 px-3 py-2 bg-mohei text-white text-xs font-serif rounded-md shadow-warm-md pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 30 }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
}
