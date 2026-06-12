import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { TimelineChart } from '@/components/TimelineChart/TimelineChart';
import { ReviewPanel } from '@/components/ReviewPanel/ReviewPanel';
import { AnomalyList } from '@/components/AnomalyList/AnomalyList';
import { DataImport } from '@/components/DataImport/DataImport';
import { GuideModal } from '@/components/GuideModal/GuideModal';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAppStore } from '@/store/useAppStore';
import { useSensorData } from '@/hooks/useSensorData';
import type { Anomaly } from '@/types';

function App() {
  const { showGuide, setShowGuide, isLoading, rawLogs, reset } = useAppStore();
  const { loadSampleData } = useSensorData();
  const [showImport, setShowImport] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('buoy_alert_seen_guide');
    if (!hasSeenGuide) {
      setShowWelcome(true);
      localStorage.setItem('buoy_alert_seen_guide', 'true');
    }
  }, []);

  const handleSelectAnomaly = useCallback((_anomaly: Anomaly) => {
    // 异常选择处理，状态已在store中管理
  }, []);

  const handleImportComplete = useCallback(() => {
    setShowImport(false);
  }, []);

  const handleLoadSample = useCallback(async () => {
    setShowImport(false);
    await loadSampleData();
  }, [loadSampleData]);

  const handleShowGuide = useCallback(() => {
    setShowGuide(true);
  }, [setShowGuide]);

  const handleShowImport = useCallback(() => {
    setShowImport(true);
  }, []);

  return (
    <div className="h-screen w-screen bg-deep-sea-500 text-deep-sea-100 flex overflow-hidden">
      <Sidebar onShowGuide={handleShowGuide} onShowImport={handleShowImport} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-deep-sea-100">数据分析</h2>
                <p className="text-xs text-deep-sea-400">
                  {rawLogs.length > 0
                    ? `已加载 ${rawLogs.length} 条传感器记录`
                    : '导入传感器日志开始分析'}
                </p>
              </div>
              {rawLogs.length > 0 && (
                <button
                  onClick={reset}
                  className="btn-secondary text-sm"
                >
                  清空数据
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <p className="text-deep-sea-300">正在分析数据...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <TimelineChart onSelectAnomaly={handleSelectAnomaly} />
                </div>
                <div className="h-64 overflow-hidden">
                  <AnomalyList onSelectAnomaly={handleSelectAnomaly} />
                </div>
              </div>
            )}
          </div>

          <div className="w-96 p-4 pl-0 overflow-hidden">
            <ReviewPanel />
          </div>
        </div>
      </div>

      <Modal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="导入传感器日志"
      >
        <DataImport onImportComplete={handleImportComplete} />
      </Modal>

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      <Modal
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        title="欢迎使用海浪浮标阈值预警系统"
      >
        <div className="space-y-4">
          <p className="text-sm text-deep-sea-200">
            本系统用于分析海洋传感器日志数据，自动检测单位混写、方向符号写反、阈值超限等异常，
            并提供完整的追溯和复核功能。
          </p>

          <div className="p-4 bg-ocean-500/10 border border-ocean-500/30 rounded-lg">
            <h4 className="text-sm font-medium text-ocean-400 mb-2">核心功能</h4>
            <ul className="text-sm text-deep-sea-200 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-alert-cyan">•</span>
                <span>
                  <strong className="text-deep-sea-100">单位混写检测</strong>
                  ：自动识别 m/km、m/s/km/h 等单位混用，保留原始痕迹
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-alert-cyan">•</span>
                <span>
                  <strong className="text-deep-sea-100">方向反转检测</strong>
                  ：检测 N/S 等方向符号写反，先标记待确认再处理
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-alert-cyan">•</span>
                <span>
                  <strong className="text-deep-sea-100">阈值预警</strong>
                  ：基于配置阈值检测超限异常
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-alert-cyan">•</span>
                <span>
                  <strong className="text-deep-sea-100">可追溯复核</strong>
                  ：参数版本、原始日志、计算口径同页展示
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowWelcome(false);
                handleLoadSample();
              }}
              className="flex-1 btn-primary"
            >
              加载样例数据
            </button>
            <button
              onClick={() => setShowWelcome(false)}
              className="btn-secondary"
            >
              稍后再说
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
