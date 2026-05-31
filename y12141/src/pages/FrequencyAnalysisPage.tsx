import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { FrequencyHeatmap } from '@/components/FrequencyHeatmap';
import { ErrorList } from '@/components/ErrorList';
import { FREQUENCY_BANDS } from '@/types';
import type { FrequencyBand } from '@/types';
import { calculateFrequencyCoverage } from '@/utils/acoustics';
import { Activity, AlertTriangle, BarChart3, BugPlay } from 'lucide-react';

export const FrequencyAnalysisPage = () => {
  const {
    roadNoiseSources,
    materials,
    errors,
    loadMockData,
    runValidation,
    addMissingFrequencyDemo,
    updateRoadNoiseSource,
    updateMaterial,
  } = useAppStore();

  useEffect(() => {
    if (roadNoiseSources.length === 0) {
      loadMockData();
    }
  }, [roadNoiseSources.length, loadMockData]);

  useEffect(() => {
    runValidation();
  }, [roadNoiseSources, materials, runValidation]);

  const coverageData = calculateFrequencyCoverage(roadNoiseSources, materials);

  const frequencyErrors = errors.filter((e) => e.type === 'frequency_missing');
  const alignmentErrors = errors.filter((e) => e.type === 'alignment_error');

  const handleCellClick = (
    type: 'source' | 'material',
    id: string,
    band: FrequencyBand
  ) => {
    const defaultValue = type === 'source' ? 80 : 30;
    if (type === 'source') {
      const source = roadNoiseSources.find((s) => s.id === id);
      if (source) {
        updateRoadNoiseSource(id, {
          spectrum: { ...source.spectrum, [band]: defaultValue },
        });
      }
    } else {
      const material = materials.find((m) => m.id === id);
      if (material) {
        updateMaterial(id, {
          transmissionLoss: { ...material.transmissionLoss, [band]: defaultValue },
        });
      }
    }
  };

  const handleErrorClick = () => {
    // 可以在这里实现跳转到具体编辑位置的逻辑
  };

  const totalCoverage =
    coverageData.length > 0
      ? Math.round(coverageData.reduce((sum, d) => sum + d.coverage, 0) / coverageData.length)
      : 100;

  return (
    <div className="min-h-screen bg-primary-950 pl-64">
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-white mb-2">频段分析</h1>
            <p className="text-primary-400">
              检查63Hz~8kHz共8个倍频程的数据完整性，定位缺失频段
            </p>
          </div>
          <button
            onClick={addMissingFrequencyDemo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange/20 text-accent-orange border border-accent-orange/30 hover:bg-accent-orange/30 transition-all text-sm"
          >
            <BugPlay size={16} />
            复现频段缺失
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {FREQUENCY_BANDS.map((band) => {
            const data = coverageData.find((d) => d.band === band);
            const coverage = data?.coverage || 100;
            return (
              <div
                key={band}
                className={`p-4 rounded-xl border ${
                  coverage === 100
                    ? 'bg-accent-green/10 border-accent-green/30'
                    : coverage >= 75
                    ? 'bg-accent-orange/10 border-accent-orange/30'
                    : 'bg-accent-red/10 border-accent-red/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-primary-300">{band} Hz</span>
                  <BarChart3
                    size={16}
                    className={
                      coverage === 100
                        ? 'text-accent-green'
                        : coverage >= 75
                        ? 'text-accent-orange'
                        : 'text-accent-red'
                    }
                  />
                </div>
                <div
                  className={`text-2xl font-bold font-mono ${
                    coverage === 100
                      ? 'text-accent-green'
                      : coverage >= 75
                      ? 'text-accent-orange'
                      : 'text-accent-red'
                  }`}
                >
                  {coverage}%
                </div>
                <div className="text-xs text-primary-500 mt-1">数据完整度</div>
                {data && (data.missingSources.length > 0 || data.missingMaterials.length > 0) && (
                  <div className="mt-2 pt-2 border-t border-primary-700/50">
                    {data.missingSources.length > 0 && (
                      <div className="text-xs text-accent-red">
                        缺失道路: {data.missingSources.join(', ')}
                      </div>
                    )}
                    {data.missingMaterials.length > 0 && (
                      <div className="text-xs text-accent-orange">
                        缺失材料: {data.missingMaterials.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity size={20} className="text-accent-blue" />
              频段数据热力图
            </h2>
            <div className="text-sm text-primary-400">
              整体完整度:
              <span
                className={`ml-2 font-mono font-bold ${
                  totalCoverage === 100
                    ? 'text-accent-green'
                    : totalCoverage >= 75
                    ? 'text-accent-orange'
                    : 'text-accent-red'
                }`}
              >
                {totalCoverage}%
              </span>
            </div>
          </div>
          <p className="text-sm text-primary-500 mb-4">
            点击缺失单元格（红色带?）可快速填入默认值。绿色表示数据完整，橙色表示数值偏低，红色表示数据缺失。
          </p>
          <FrequencyHeatmap
            sources={roadNoiseSources}
            materials={materials}
            onCellClick={handleCellClick}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent-red" />
              频段缺失问题 ({frequencyErrors.length})
            </h3>
            <ErrorList
              errors={frequencyErrors}
              onErrorClick={handleErrorClick}
              maxItems={8}
            />
          </div>

          <div className="bg-primary-900/80 border border-primary-700 rounded-xl p-5">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent-orange" />
              数据对齐问题 ({alignmentErrors.length})
            </h3>
            <ErrorList
              errors={alignmentErrors}
              onErrorClick={handleErrorClick}
              maxItems={8}
            />
          </div>
        </div>

        <div className="mt-6 bg-primary-800/30 border border-primary-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">频段标准说明</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-primary-400">低频段：</span>
              <span className="text-white">63Hz, 125Hz</span>
            </div>
            <div>
              <span className="text-primary-400">中频段：</span>
              <span className="text-white">250Hz, 500Hz, 1kHz</span>
            </div>
            <div>
              <span className="text-primary-400">高频段：</span>
              <span className="text-white">2kHz, 4kHz</span>
            </div>
            <div>
              <span className="text-primary-400">超高频段：</span>
              <span className="text-white">8kHz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
