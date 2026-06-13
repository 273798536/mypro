import { useState, useMemo } from 'react';
import { useDeflectionStore } from '@/store/useDeflectionStore';
import { useRecalibration } from '@/hooks/useRecalibration';
import StatusBadge from '@/components/common/StatusBadge';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import CalibrationChart from '@/components/chart/CalibrationChart';
import EmptyState from '@/components/common/EmptyState';

export default function VerifyPage() {
  const rawRecords = useDeflectionStore((s) => s.rawRecords);
  const { recalcResult, isCalibrating, runRecalc, lastRecalcTime } = useRecalibration();

  const boundaryRecords = useMemo(
    () => rawRecords.filter((r) => r.isBoundary),
    [rawRecords]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRecord = useMemo(
    () => rawRecords.find((r) => r.id === selectedId) ?? null,
    [rawRecords, selectedId]
  );

  const handleRecalc = () => {
    if (!selectedId) return;
    runRecalc(selectedId);
  };

  return (
    <div className="min-h-screen bg-[#0f2440]">
      <header className="bg-[#1e3a5f] border-b-2 border-[#2d5a8e] px-6 py-4">
        <h1 className="text-white text-xl font-bold tracking-wide">边界样本验证</h1>
        <p className="text-[#8ba7c7] text-sm mt-1">复算校验与一致性检查</p>
      </header>

      <div className="flex h-[calc(100vh-88px)]">
        <div className="w-72 border-r-2 border-[#2d5a8e] overflow-y-auto">
          <div className="p-3">
            <p className="text-[#8ba7c7] text-xs mb-2 px-1">
              边界样本 ({boundaryRecords.length})
            </p>
            {boundaryRecords.length === 0 ? (
              <EmptyState message="无边界样本" />
            ) : (
              <div className="space-y-1">
                {boundaryRecords.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => setSelectedId(record.id)}
                    className={`w-full text-left p-3 border-2 transition-colors ${
                      selectedId === record.id
                        ? 'bg-[#2d5a8e] border-[#5a9fd4]'
                        : 'bg-[#1e3a5f] border-[#2d5a8e] hover:border-[#5a9fd4]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-mono text-sm">{record.beamNumber}</span>
                      <StatusBadge status={record.status} />
                    </div>
                    <div className="text-[#8ba7c7] text-xs">
                      {record.deflectionValue.toFixed(3)} mm
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedRecord ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#4a5568]">请选择左侧边界样本</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white font-semibold">{selectedRecord.beamNumber}</h2>
                    <p className="text-[#8ba7c7] text-xs mt-1">
                      原始值: {selectedRecord.deflectionValue.toFixed(3)} mm | 阈值: [{selectedRecord.threshold.min.toFixed(3)}, {selectedRecord.threshold.max.toFixed(3)}]
                    </p>
                  </div>
                  <button
                    onClick={handleRecalc}
                    disabled={isCalibrating}
                    className={`px-6 py-2 border-2 font-semibold transition-colors ${
                      isCalibrating
                        ? 'bg-[#2d5a8e] border-[#3d6a9e] text-[#8ba7c7] cursor-not-allowed'
                        : 'bg-[#5a67d8] border-[#6b76e8] text-white hover:bg-[#4c59c7]'
                    }`}
                  >
                    {isCalibrating ? '复算中...' : '执行复算'}
                  </button>
                </div>
                {lastRecalcTime && (
                  <p className="text-[#4a5568] text-xs mt-2">
                    上次复算: {new Date(lastRecalcTime).toLocaleString()}
                  </p>
                )}
              </div>

              {recalcResult && (
                <>
                  <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4">
                    <h3 className="text-white font-semibold mb-3">一致性检查</h3>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 border-2 ${
                          recalcResult.isConsistent
                            ? 'bg-[#2f855a] border-[#38a169]'
                            : 'bg-[#c53030] border-[#e53e3e]'
                        }`}
                      />
                      <span
                        className={`font-semibold ${
                          recalcResult.isConsistent ? 'text-[#2f855a]' : 'text-[#c53030]'
                        }`}
                      >
                        {recalcResult.isConsistent ? '一致' : '不一致'}
                      </span>
                    </div>
                    <p className="text-[#8ba7c7] text-xs mt-2">
                      使用公式: {recalcResult.formulaUsed}
                    </p>
                  </div>

                  <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4">
                    <h3 className="text-white font-semibold mb-3">校准曲线</h3>
                    <CalibrationChart data={recalcResult.chartData} />
                  </div>

                  <div className="bg-[#1e3a5f] border-2 border-[#2d5a8e] p-4">
                    <h3 className="text-white font-semibold mb-3">数值对比</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#2d5a8e]">
                          <th className="text-[#8ba7c7] text-left py-2 font-normal">指标</th>
                          <th className="text-[#8ba7c7] text-right py-2 font-normal">原始值</th>
                          <th className="text-[#8ba7c7] text-right py-2 font-normal">复算值</th>
                          <th className="text-[#8ba7c7] text-right py-2 font-normal">偏差</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#2d5a8e]">
                          <td className="text-white py-2">挠度值</td>
                          <td className="text-white text-right font-mono py-2">
                            <AnimatedNumber value={recalcResult.originalValue} decimals={3} />
                          </td>
                          <td className="text-white text-right font-mono py-2">
                            <AnimatedNumber value={recalcResult.recalculatedValue} decimals={3} />
                          </td>
                          <td
                            className={`text-right font-mono py-2 ${
                              Math.abs(recalcResult.recalculatedValue - recalcResult.originalValue) > 0.001
                                ? 'text-[#c53030]'
                                : 'text-[#2f855a]'
                            }`}
                          >
                            <AnimatedNumber
                              value={recalcResult.recalculatedValue - recalcResult.originalValue}
                              decimals={6}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
