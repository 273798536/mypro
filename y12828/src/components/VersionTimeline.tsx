import { useState } from 'react';
import { GitBranch, User, Clock, FileText, Sparkles, Edit3, AlertTriangle, Eye } from 'lucide-react';
import dayjs from 'dayjs';
import { SampleVersion } from '@/types';
import { useSampleStore } from '@/stores/sampleStore';
import { cn } from '@/lib/utils';

interface VersionTimelineProps {
  versions: SampleVersion[];
  selectedVersionId?: string;
  onSelectVersion: (version: SampleVersion) => void;
}

export function VersionTimeline({ versions, selectedVersionId, onSelectVersion }: VersionTimelineProps) {
  const { users } = useSampleStore();
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <div className="lab-card p-8 text-center">
        <GitBranch className="mx-auto mb-3 text-lab-textMuted" size={32} />
        <p className="text-lab-textMuted text-sm">暂无版本记录</p>
      </div>
    );
  }

  const sortedVersions = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);

  return (
    <div className="lab-card p-6">
      <h3 className="text-lg font-serif font-bold text-primary-600 mb-6 flex items-center gap-2">
        <GitBranch size={20} />
        版本历史
        <span className="ml-auto text-sm font-normal text-lab-textMuted">
          共 {versions.length} 个版本
        </span>
      </h3>

      <div className="relative">
        {sortedVersions.map((version, index) => {
          const operator = users.find((u) => u.id === version.createdBy);
          const isSelected = selectedVersionId === version.versionId;
          const isHovered = hoveredVersionId === version.versionId;
          const isLatest = index === sortedVersions.length - 1;
          const hasDuplicate = version.isDuplicate;
          const hasAiAnalysis = !!version.aiAnalysis;
          const hasCorrections = version.manualCorrections.length > 0;

          return (
            <div
              key={version.versionId}
              className={cn(
                'timeline-node cursor-pointer group',
                isSelected && 'active',
                hasDuplicate && 'duplicate'
              )}
              onMouseEnter={() => setHoveredVersionId(version.versionId)}
              onMouseLeave={() => setHoveredVersionId(null)}
              onClick={() => onSelectVersion(version)}
            >
              <div
                className={cn(
                  'absolute left-[-11px] top-0 w-5 h-5 rounded-full border-2 border-white shadow transition-all duration-200',
                  isSelected
                    ? 'bg-accent-500 scale-110 shadow-glow-accent'
                    : hasDuplicate
                    ? 'bg-warning-500'
                    : isLatest
                    ? 'bg-primary-500'
                    : 'bg-lab-border group-hover:bg-primary-400'
                )}
              />

              <div
                className={cn(
                  'ml-4 p-4 rounded-xl border transition-all duration-200',
                  isSelected
                    ? 'bg-primary-50 border-primary-200 shadow-md'
                    : isHovered
                    ? 'bg-lab-bg border-lab-border shadow-sm'
                    : 'bg-white border-transparent'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-primary-600">
                        v{version.versionNumber}
                      </span>
                      {isLatest && <span className="tag-accent text-[10px]">最新</span>}
                      {hasDuplicate && (
                        <span className="tag-warning text-[10px]">
                          <AlertTriangle size={10} className="mr-0.5" />
                          重复
                        </span>
                      )}
                      <span
                        className={cn('tag text-[10px]', {
                          'bg-accent-50 text-accent-700': version.status === 'confirmed',
                          'bg-warning-50 text-warning-700': version.status === 'reviewing',
                          'bg-primary-50 text-primary-700': version.status === 'pending',
                          'bg-danger-50 text-danger-700': version.status === 'conflict',
                        })}
                      >
                        {version.status === 'confirmed' && '已确认'}
                        {version.status === 'reviewing' && '复核中'}
                        {version.status === 'pending' && '待处理'}
                        {version.status === 'conflict' && '有冲突'}
                      </span>
                    </div>
                    <p className="text-sm text-lab-text">{version.changeReason}</p>
                  </div>
                  <button
                    className={cn(
                      'opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-primary-100',
                      isSelected && 'opacity-100 bg-primary-100'
                    )}
                  >
                    <Eye size={16} className="text-primary-600" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-lab-textMuted">
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {operator?.name || '未知'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {dayjs(version.createdAt).format('MM-DD HH:mm')}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} />
                    {version.sequencingResult.geneName}
                  </span>
                  {hasAiAnalysis && (
                    <span className="flex items-center gap-1 text-accent-600">
                      <Sparkles size={12} />
                      AI分析
                    </span>
                  )}
                  {hasCorrections && (
                    <span className="flex items-center gap-1 text-warning-600">
                      <Edit3 size={12} />
                      {version.manualCorrections.length} 处修正
                    </span>
                  )}
                </div>

                {(isSelected || isHovered) && (
                  <div className="mt-3 pt-3 border-t border-lab-border/50 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-lab-textMuted">原始行号:</span>
                        <span className="ml-1 font-mono font-medium">
                          {version.sourceOrigin.originalRowNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-lab-textMuted">来源文件:</span>
                        <span className="ml-1 font-mono text-primary-600 truncate max-w-[180px] inline-block align-bottom">
                          {version.sourceOrigin.originalFileName}
                        </span>
                      </div>
                      <div>
                        <span className="text-lab-textMuted">来源备注:</span>
                        <span className="ml-1">{version.sourceOrigin.sourceRemark}</span>
                      </div>
                      <div>
                        <span className="text-lab-textMuted">批次:</span>
                        <span className="ml-1 font-mono">
                          {version.groupIndicators.batchId}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
