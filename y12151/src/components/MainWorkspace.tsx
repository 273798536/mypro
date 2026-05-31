import { useState } from 'react';
import { Waves, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';
import { useCalibrationStore } from '../store/useCalibrationStore';
import { RangingRecord } from '../types';
import { FileUploader } from './DataImport/FileUploader';
import { PhaseIndicator } from './DataImport/PhaseIndicator';
import { CalibrationPanel } from './CalibrationPanel/CalibrationPanel';
import { RangingTable } from './DataTable/RangingTable';
import { ComparisonChart, ErrorDistributionChart, TempSoundSpeedChart } from './Charts/Charts';
import { AnomalyPanel } from './AnomalyPanel/AnomalyPanel';
import { ExportPanel } from './ExportPanel/ExportPanel';
import { RecordDetailModal } from './RecordDetail/RecordDetailModal';

export const MainWorkspace = () => {
  const { 
    records, 
    phase, 
    reset,
    setFilters,
  } = useCalibrationStore();
  
  const [selectedRecord, setSelectedRecord] = useState<RangingRecord | null>(null);
  const [showPhase2Import, setShowPhase2Import] = useState(false);

  const hasPhase1Data = records.length > 0;
  const hasPhase2Data = records.some(r => r.reflectiveMaterial);

  const handleSelectRecord = (record: RangingRecord) => {
    setSelectedRecord(record);
  };

  const handleCloseModal = () => {
    setSelectedRecord(null);
  };

  const handleFilterAffectedByMaterial = () => {
    setFilters({ affectedByMaterial: true });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#0A2463] text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#3E92CC] rounded-xl">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">声波测距校准器</h1>
              <p className="text-xs text-[#3E92CC]">Sound Wave Ranging Calibrator</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重置数据
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <PhaseIndicator 
          currentPhase={phase} 
          hasPhase1Data={hasPhase1Data}
          hasPhase2Data={hasPhase2Data}
        />

        {!hasPhase1Data ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                开始导入数据
              </h2>
              <p className="text-gray-500">
                第一阶段：导入测距记录和环境温度数据
              </p>
            </div>
            <FileUploader phase="phase1" />
          </div>
        ) : (
          <>
            {showPhase2Import ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="text-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    第二阶段：补录反射面材质
                  </h2>
                  <p className="text-gray-500">
                    导入材质数据后，系统将重新执行校准
                  </p>
                </div>
                <FileUploader phase="phase2" />
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowPhase2Import(false)}
                    className="text-[#3E92CC] hover:underline text-sm"
                  >
                    跳过，稍后再补录
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!hasPhase2Data && (
                  <div className="bg-gradient-to-r from-[#3E92CC]/10 to-[#0A2463]/10 rounded-xl p-4 border border-[#3E92CC]/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#3E92CC] rounded-lg">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-[#0A2463]">
                            可进行第二阶段校准
                          </p>
                          <p className="text-sm text-gray-600">
                            补录反射面材质数据，获得更精确的校准结果
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowPhase2Import(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3E92CC] text-white rounded-lg hover:bg-[#3E92CC]/90 transition-colors"
                      >
                        导入材质数据
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {hasPhase2Data && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">
                          第二阶段校准已完成
                        </p>
                        <p className="text-sm text-green-700">
                          已应用反射面材质校正
                          {records.filter(r => r.affectedByMaterial).length > 0 && (
                            <button
                              onClick={handleFilterAffectedByMaterial}
                              className="ml-2 text-green-600 hover:underline"
                            >
                              ({records.filter(r => r.affectedByMaterial).length} 条记录受材质影响 →)
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    <CalibrationPanel />
                    <RangingTable onSelectRecord={handleSelectRecord} />
                    <ComparisonChart />
                  </div>
                  <div className="space-y-6">
                    <AnomalyPanel />
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">辅助图表</h3>
                      <div className="space-y-6">
                        <ErrorDistributionChart />
                        <TempSoundSpeedChart />
                      </div>
                    </div>
                    <ExportPanel />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <RecordDetailModal 
        record={selectedRecord} 
        onClose={handleCloseModal} 
      />
    </div>
  );
};
