import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { validateStations, validateLines, validateBuses } from '../utils/dataValidator';
import { Station, BusLine, Bus, DataValidationIssue } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const initGame = useGameStore(state => state.initGame);
  const loadCustomData = useGameStore(state => state.loadCustomData);

  const [showImportModal, setShowImportModal] = useState(false);
  const [validationIssues, setValidationIssues] = useState<DataValidationIssue[]>([]);
  const [importedData, setImportedData] = useState<{
    stations: Station[];
    lines: BusLine[];
    buses: Bus[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartNormal = () => {
    initGame(false);
    navigate('/game');
  };

  const handleStartBroken = () => {
    initGame(true);
    navigate('/game');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        const stationResult = validateStations(data.stations || []);
        const lineResult = validateLines(data.lines || []);
        const busResult = validateBuses(data.buses || []);

        const allIssues = [
          ...stationResult.issues,
          ...lineResult.issues,
          ...busResult.issues,
        ];

        setValidationIssues(allIssues);
        setImportedData({
          stations: stationResult.data!,
          lines: lineResult.data!,
          buses: busResult.data!,
        });
      } catch (error) {
        alert('文件解析失败，请检查JSON格式');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (importedData) {
      loadCustomData(importedData.stations, importedData.lines, importedData.buses);
      navigate('/game');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-traffic-blue mb-4">
            🚌 城市公交调度棋
          </h1>
          <p className="text-xl text-gray-600">
            早高峰调度模拟培训系统
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={handleStartNormal}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-traffic-blue"
          >
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">标准场景</h2>
            <p className="text-gray-600">
              使用完整的样例数据开始培训，适合初次学习调度基础
            </p>
          </button>

          <button
            onClick={handleStartBroken}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-passenger-red"
          >
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">异常测试场景</h2>
            <p className="text-gray-600">
              包含预置异常的测试场景，验证异常检测和处理能力
            </p>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-safe-green"
          >
            <div className="text-6xl mb-4">📁</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">导入数据</h2>
            <p className="text-gray-600">
              上传自定义公交数据，系统自动检测并提示缺失字段
            </p>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 游戏规则</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-traffic-blue mb-2">🎯 胜利条件</h4>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• 总分达到 80 分以上</li>
                <li>• 客流疏导率 × 40% + 准点率 × 30% + 异常处理 × 30%</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-passenger-red mb-2">❌ 失败条件</h4>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• 总分低于 60 分</li>
                <li>• 任意站点连续 3 回合客流超载</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-warning-orange mb-2">⚠️ 异常类型</h4>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• 车辆扎堆：同站点 ≥ 3 辆车</li>
                <li>• 司机超时：连续驾驶 ＞ 4 小时</li>
                <li>• 换乘断档：衔接 ＞ 15 分钟</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-safe-green mb-2">💡 操作提示</h4>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• 每回合可进行调度决策</li>
                <li>• 点击异常卡片可标记已处理</li>
                <li>• 点击车辆可执行强制调度</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">📁 导入公交数据</h3>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            {!importedData ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-traffic-blue transition-colors"
              >
                <div className="text-5xl mb-4">📄</div>
                <p className="text-gray-600">点击选择 JSON 文件</p>
                <p className="text-sm text-gray-400 mt-2">
                  格式: {`{ stations: [], lines: [], buses: [] }`}
                </p>
              </div>
            ) : (
              <>
                {validationIssues.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-warning-orange mb-3">
                      ⚠️ 数据修正提示 ({validationIssues.length} 项)
                    </h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
                      {validationIssues.map((issue, index) => (
                        <div
                          key={index}
                          className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm"
                        >
                          <p className="font-medium text-yellow-800">{issue.message}</p>
                          <p className="text-yellow-600 mt-1">{issue.suggestion}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      * 缺失字段已自动填充默认值，可继续使用
                    </p>
                  </div>
                )}

                {validationIssues.length === 0 && (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-700">✅ 数据完整，无需修正</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setImportedData(null);
                      setValidationIssues([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    重新选择
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="flex-1 px-6 py-3 bg-traffic-blue text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                  >
                    确认导入
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => {
                setShowImportModal(false);
                setImportedData(null);
                setValidationIssues([]);
              }}
              className="mt-6 w-full px-6 py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
