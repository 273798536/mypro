import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, FileText, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import CategoryTabs from '@/components/CategoryTabs';
import GradingTable from '@/components/GradingTable';
import LightPathCanvas from '@/components/LightPathCanvas';
import type { Verdict } from '@/utils/types';

export default function GradingPage() {
  const navigate = useNavigate();
  const mirrors = useAppStore((s) => s.mirrors);
  const rays = useAppStore((s) => s.rays);
  const results = useAppStore((s) => s.results);
  const isGraded = useAppStore((s) => s.isGraded);
  const runGrading = useAppStore((s) => s.runGrading);
  const selectedResultId = useAppStore((s) => s.selectedResultId);

  const [activeTab, setActiveTab] = useState<Verdict | 'all'>('all');

  const counts = useMemo(
    () => ({
      all: results.length,
      pass: results.filter((r) => r.verdict === 'pass').length,
      error: results.filter((r) => r.verdict === 'error').length,
      pending: results.filter((r) => r.verdict === 'pending').length,
    }),
    [results]
  );

  const selectedResult = useMemo(
    () => results.find((r) => r.id === selectedResultId) ?? null,
    [results, selectedResultId]
  );

  if (mirrors.length === 0 || rays.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <div className="text-gray-400">尚未导入数据</div>
          <button
            onClick={() => navigate('/import')}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-[#f0c040] text-[#1a1a2e] hover:bg-[#f0c040]/90"
          >
            前往导入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-5 border-b border-[#2d2d44] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">批改执行</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mirrors.length} 条镜面 × {rays.length} 条光线 = {mirrors.length * rays.length} 组批改
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isGraded && (
            <button
              onClick={runGrading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[#f0c040] text-[#1a1a2e] hover:bg-[#f0c040]/90 shadow-lg shadow-[#f0c040]/20 transition-all"
            >
              <Play className="w-4 h-4" />
              开始批改
            </button>
          )}
          {isGraded && (
            <button
              onClick={() => navigate('/report')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 transition-colors"
            >
              <FileText className="w-4 h-4" />
              查看报告
            </button>
          )}
        </div>
      </div>

      {isGraded && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-8 py-3 border-b border-[#2d2d44]/50">
              <CategoryTabs activeTab={activeTab} onChange={setActiveTab} counts={counts} />
            </div>
            <div className="flex-1 overflow-auto px-8 py-4">
              <GradingTable
                results={results}
                mirrors={mirrors}
                rays={rays}
                filter={activeTab}
              />
            </div>
          </div>
          <div className="w-[400px] flex-shrink-0 border-l border-[#2d2d44] p-4 flex flex-col">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f0c040]" />
              光路可视化
              {selectedResult && (
                <span className="font-mono text-[#f0c040]">
                  {selectedResult.rayId} → {selectedResult.mirrorId}
                </span>
              )}
            </h3>
            <div className="flex-1 min-h-0">
              <LightPathCanvas mirrors={mirrors} rays={rays} result={selectedResult} />
            </div>
          </div>
        </div>
      )}

      {!isGraded && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Play className="w-10 h-10 text-[#f0c040]/40 mx-auto" />
            <div className="text-gray-500 text-sm">点击"开始批改"执行几何计算</div>
          </div>
        </div>
      )}
    </div>
  );
}
