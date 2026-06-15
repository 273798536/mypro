import { ArrowLeftRight, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { versionSourceLabels } from '@/data/mockData';
import type { MaterialVersion } from '@/types';

interface VersionCompareProps {
  versions: MaterialVersion[];
}

export default function VersionCompare({ versions }: VersionCompareProps) {
  if (versions.length < 2) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">仅有一个版本，无需对比</p>
      </div>
    );
  }

  const latestVersion = versions.find((v) => v.isLatest);
  const olderVersions = versions.filter((v) => !v.isLatest);

  const getSuggestionType = (suggestion: string) => {
    if (suggestion.includes('保留新版') || suggestion.includes('建议使用新版')) {
      return 'success';
    }
    if (suggestion.includes('需人工确认') || suggestion.includes('需核实')) {
      return 'warning';
    }
    return 'info';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight className="w-5 h-5 text-[#D4A853]" />
        <h4 className="font-serif font-semibold text-[#0F2B4D]">版本对比</h4>
        <span className="text-xs text-gray-400">共 {versions.length} 个版本</span>
      </div>

      {/* Latest version */}
      {latestVersion && (
        <div className="border-2 border-[#D4A853]/30 rounded-xl p-4 bg-gradient-to-br from-[#D4A853]/5 to-transparent">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#D4A853] text-white text-xs font-bold rounded-md">
                最新版本
              </span>
              <span className="font-serif font-bold text-lg text-[#0F2B4D]">
                {latestVersion.version}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {versionSourceLabels[latestVersion.source]}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-3">{latestVersion.diffSummary}</p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">上传时间: {latestVersion.uploadDate}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium',
                getSuggestionType(latestVersion.suggestion) === 'success' &&
                  'bg-green-100 text-green-700',
                getSuggestionType(latestVersion.suggestion) === 'warning' &&
                  'bg-amber-100 text-amber-700',
                getSuggestionType(latestVersion.suggestion) === 'info' &&
                  'bg-blue-100 text-blue-700'
              )}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {latestVersion.suggestion}
            </span>
          </div>
        </div>
      )}

      {/* Older versions */}
      {olderVersions.map((version) => (
        <div
          key={version.id}
          className="border border-gray-200 rounded-xl p-4 bg-white opacity-75"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-md">
                历史版本
              </span>
              <span className="font-serif font-semibold text-gray-600">
                {version.version}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {versionSourceLabels[version.source]}
            </span>
          </div>

          <p className="text-sm text-gray-500 mb-3">{version.diffSummary}</p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">上传时间: {version.uploadDate}</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              {version.suggestion}
            </span>
          </div>
        </div>
      ))}

      {/* Warning note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">重要提示</p>
          <p className="text-xs text-amber-700 mt-0.5">
            系统不会自动用旧版覆盖新版数据。如需使用旧版本数据，请人工确认后操作。
          </p>
        </div>
      </div>
    </div>
  );
}
