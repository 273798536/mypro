import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import {
  GitBranch,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Calculator,
  Image,
  FileSpreadsheet,
  FlaskConical,
  Database,
} from 'lucide-react';

export default function LineageTrace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { batches, samples } = useAppStore();

  const batch = batches.find((b) => b.id === id);
  const batchSamples = samples.filter((s) => s.batchId === id);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['对照组']));
  const [expandedSamples, setExpandedSamples] = useState<Set<string>>(new Set());

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-abyss-500">
        <FlaskConical className="w-16 h-16 mb-4 opacity-30" />
        <p>批次不存在</p>
      </div>
    );
  }

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const toggleSample = (sampleId: string) => {
    setExpandedSamples((prev) => {
      const next = new Set(prev);
      if (next.has(sampleId)) {
        next.delete(sampleId);
      } else {
        next.add(sampleId);
      }
      return next;
    });
  };

  const validSamples = batchSamples.filter((s) => s.status !== 'contaminated');
  const groups = [...new Set(validSamples.map((s) => s.groupName))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-md hover:bg-abyss-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-abyss-600" />
        </button>
        <div>
          <h2 className="text-xl font-serif-cn font-bold text-abyss-900">谱系追踪 - {batch.name}</h2>
          <p className="text-sm text-abyss-500 mt-1">
            从最终结论反向追溯到具体样本、原始图片和来源材料
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-base overflow-hidden animate-fade-in-up stagger-1">
          <div className="px-6 py-4 border-b border-abyss-100/80 bg-gradient-to-r from-ember-50 to-transparent">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-ember-500" />
              <h3 className="text-base font-semibold text-abyss-800">最终结论</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-abyss-700 leading-relaxed">
              {batch.conclusion || '暂无最终结论'}
            </p>
            <div className="mt-4 pt-4 border-t border-abyss-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-abyss-500">批次效应得分</span>
                <span className="font-semibold text-abyss-800">
                  {(batch.batchEffectScore * 100).toFixed(0)}分
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-base overflow-hidden animate-fade-in-up stagger-2">
          <div className="px-6 py-4 border-b border-abyss-100/80 bg-gradient-to-r from-abyss-50 to-transparent">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-abyss-500" />
              <h3 className="text-base font-semibold text-abyss-800">分组统计依据</h3>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {batch.groupStatistics.map((stat) => (
              <div
                key={stat.groupName}
                className="flex items-center justify-between p-3 bg-ivory-50 rounded-lg hover:bg-ivory-100 transition-colors cursor-pointer"
                onClick={() => toggleGroup(stat.groupName)}
              >
                <div className="flex items-center gap-3">
                  {expandedGroups.has(stat.groupName) ? (
                    <ChevronDown className="w-4 h-4 text-abyss-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-abyss-400" />
                  )}
                  <span className="text-sm font-medium text-abyss-700">{stat.groupName}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-abyss-800">{stat.avgSurvivalRate}%</span>
                  <span className="text-xs text-abyss-500 ml-2">n={stat.sampleCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-base overflow-hidden animate-fade-in-up stagger-3">
        <div className="px-6 py-4 border-b border-abyss-100/80">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-abyss-500" />
            <h3 className="text-base font-semibold text-abyss-800">样本溯源树</h3>
            <span className="text-xs text-abyss-400">点击展开查看样本详情和来源</span>
          </div>
        </div>
        <div className="p-4 max-h-[500px] overflow-y-auto">
          <div className="space-y-1">
            {groups.map((groupName, groupIdx) => {
              const groupSamples = validSamples.filter((s) => s.groupName === groupName);
              const isExpanded = expandedGroups.has(groupName);

              return (
                <div key={groupName} className="animate-fade-in" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-abyss-50 cursor-pointer transition-colors"
                    onClick={() => toggleGroup(groupName)}
                  >
                    <div className="w-7 h-7 rounded-md bg-abyss-100 flex items-center justify-center flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-abyss-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-abyss-500" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-moss-100 flex items-center justify-center flex-shrink-0">
                      <Calculator className="w-4 h-4 text-moss-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-abyss-800">{groupName}</div>
                      <div className="text-xs text-abyss-500">{groupSamples.length} 个样本</div>
                    </div>
                    <div className="text-sm font-semibold text-abyss-700">
                      {batch.groupStatistics.find((g) => g.groupName === groupName)?.avgSurvivalRate}%
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="ml-10 pl-4 border-l-2 border-abyss-100 space-y-1 py-1 animate-fade-in">
                      {groupSamples.map((sample) => {
                        const sampleExpanded = expandedSamples.has(sample.id);
                        return (
                          <div key={sample.id}>
                            <div
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-ivory-50 cursor-pointer transition-colors"
                              onClick={() => toggleSample(sample.id)}
                            >
                              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                {sampleExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-abyss-400" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-abyss-400" />
                                )}
                              </div>
                              <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <Image className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-abyss-700 truncate">
                                  {sample.sampleId}
                                </div>
                                <div className="text-xs text-abyss-400 font-mono truncate">
                                  {sample.imageName} · 行#{sample.originalRowNumber}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-abyss-700 flex-shrink-0">
                                {sample.survivalRate}%
                              </div>
                            </div>

                            {sampleExpanded && (
                              <div className="ml-9 pl-4 border-l-2 border-amber-100 py-2 space-y-2 animate-fade-in">
                                <div className="p-3 bg-ivory-50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-medium text-abyss-700">来源材料</span>
                                  </div>
                                  <p className="text-xs text-abyss-600 leading-relaxed">{sample.sourceNote}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2 bg-abyss-50 rounded">
                                    <div className="text-xs text-abyss-500">原始行号</div>
                                    <div className="text-sm font-mono font-semibold text-abyss-700">#{sample.originalRowNumber}</div>
                                  </div>
                                  <div className="p-2 bg-abyss-50 rounded">
                                    <div className="text-xs text-abyss-500">浓度</div>
                                    <div className="text-sm font-semibold text-abyss-700">{sample.concentration} μg/mL</div>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/batch/${batch.id}`);
                                  }}
                                  className="w-full py-2 text-xs text-abyss-500 hover:text-abyss-700 flex items-center justify-center gap-1"
                                >
                                  <Database className="w-3.5 h-3.5" />
                                  跳转到批次详情
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card-base p-6 animate-fade-in-up stagger-4">
        <h3 className="section-title">溯源说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-ember-50 to-transparent rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-ember-100 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-ember-600" />
            </div>
            <h4 className="text-sm font-semibold text-abyss-800 mb-1">最终结论</h4>
            <p className="text-xs text-abyss-600">导师审核后的结论，可直接用于论文或实验报告</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-abyss-50 to-transparent rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-abyss-100 flex items-center justify-center mb-3">
              <Calculator className="w-5 h-5 text-abyss-600" />
            </div>
            <h4 className="text-sm font-semibold text-abyss-800 mb-1">分组统计</h4>
            <p className="text-xs text-abyss-600">基于有效样本计算的统计结果，排除污染样本</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-amber-50 to-transparent rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            </div>
            <h4 className="text-sm font-semibold text-abyss-800 mb-1">原始样本</h4>
            <p className="text-xs text-abyss-600">保留原始行号和来源备注，可追溯到具体材料</p>
          </div>
        </div>
      </div>
    </div>
  );
}
