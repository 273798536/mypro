import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVersionStore } from '@/store/useVersionStore';
import SampleTable from '@/components/Table/SampleTable';
import JsonViewerModal from '@/components/Modal/JsonViewerModal';
import LeakSection from '@/components/Alert/LeakSection';
import type { Sample } from '@/types';
import { ListChecks, RefreshCw, Download, ArrowLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/helpers';

export default function Samples() {
  const navigate = useNavigate();
  const params = useParams<{ versionId?: string }>();
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);

  const {
    versions,
    rerunStatus,
    selectedTargetVersionId,
    setSelectedTargetVersion,
    getTopContributionSamples,
    getLeakSamples,
    rerunSample,
    rerunAll,
    toggleLeakStatus,
  } = useVersionStore();

  const currentVersionId = params.versionId || selectedTargetVersionId;
  const currentVersion =
    versions.find((v) => v.id === currentVersionId) || versions[0];

  const topSamples = getTopContributionSamples(currentVersion.id, 20);
  const leakSamples = getLeakSamples(currentVersion.id);

  const handleRerunAll = () => {
    if (confirm('确定要重新运行所有样本吗？')) {
      rerunAll(currentVersion.id);
    }
  };

  const handleVersionChange = (id: string) => {
    setSelectedTargetVersion(id);
    navigate(`/samples/${id}`);
    setShowVersionDropdown(false);
  };

  const handleExport = () => {
    const data = {
      version: currentVersion.versionNumber,
      exportTime: new Date().toISOString(),
      topContributionSamples: topSamples.map((s) => ({
        productName: s.productName,
        contribution: s.contribution.score,
        impactReason: s.contribution.impactReason,
        attributes: s.attributes,
      })),
      leakSamples: leakSamples.map((s) => ({
        productName: s.productName,
        reason: currentVersion.leakRecords.find((r) => r.sampleId === s.id)?.reason,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `samples_${currentVersion.versionNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="animate-fade-in"
      onClick={() => setShowVersionDropdown(false)}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-bg-secondary text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ListChecks size={28} className="text-accent-green" />
              样本详情
            </h1>
            <p className="text-gray-400">
              查看对结论影响最大的样本，定位问题根源
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVersionDropdown(!showVersionDropdown);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary border border-border-color hover:border-accent-blue/30 transition-colors"
            >
              <span className="text-white font-display font-medium">
                {currentVersion.versionNumber}
              </span>
              <span className="text-xs text-gray-400">
                {currentVersion.samples.length} 条样本
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>

            {showVersionDropdown && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-bg-secondary border border-border-color rounded-lg shadow-xl z-10 overflow-hidden">
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleVersionChange(v.id)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-bg-tertiary transition-colors border-b border-border-color/50 last:border-0',
                      v.id === currentVersion.id && 'bg-bg-tertiary'
                    )}
                  >
                    <span
                      className={cn(
                        'font-display font-medium',
                        v.status === 'withdrawn'
                          ? 'text-gray-500 line-through'
                          : 'text-white'
                      )}
                    >
                      {v.versionNumber}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{v.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleRerunAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/10 border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/20 transition-colors"
          >
            <RefreshCw size={16} />
            重跑全部
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary border border-border-color hover:border-accent-green/30 text-gray-300 hover:text-white transition-colors"
          >
            <Download size={16} />
            导出报告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <p className="text-gray-400 text-sm mb-2">总样本数</p>
          <p className="font-display text-2xl font-bold text-white">
            {currentVersion.samples.length}
          </p>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <p className="text-gray-400 text-sm mb-2">Top 5 贡献度</p>
          <p className="font-display text-2xl font-bold text-accent-orange">
            {(
              topSamples
                .slice(0, 5)
                .reduce((sum, s) => sum + s.contribution.score, 0)
            ).toFixed(1)}
            %
          </p>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <p className="text-gray-400 text-sm mb-2">泄漏样本数</p>
          <p className="font-display text-2xl font-bold text-accent-red">
            {leakSamples.length}
          </p>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border-color p-5">
          <p className="text-gray-400 text-sm mb-2">已完成重跑</p>
          <p className="font-display text-2xl font-bold text-accent-green">
            {
              Object.values(rerunStatus).filter(
                (s) => s === 'done'
              ).length
            }
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-display text-xl font-semibold text-white mb-4">
          拉偏样本 Top 20
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          按贡献度排序，贡献度越高表示该样本对整体结论的影响越大
        </p>
        <SampleTable
          samples={topSamples}
          versionId={currentVersion.id}
          rerunStatus={rerunStatus}
          onViewSample={setSelectedSample}
          onRerunSample={(sampleId) => rerunSample(currentVersion.id, sampleId)}
        />
      </div>

      <LeakSection
        version={currentVersion}
        onToggleLeak={(sampleId, reason) =>
          toggleLeakStatus(currentVersion.id, sampleId, reason)
        }
        onViewSample={setSelectedSample}
      />

      <JsonViewerModal
        sample={selectedSample}
        onClose={() => setSelectedSample(null)}
      />
    </div>
  );
}
