import React, { useState, useEffect } from 'react';
import { Play, Upload, Database, Info, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ImportModal from '@/components/home/ImportModal';
import HistoryList from '@/components/home/HistoryList';
import type { GameRecord, ImportResult, Patient } from '@/types';
import { getGameRecords, getStoredPatients } from '@/utils/dataManager';
import { useGameStore } from '@/stores/useGameStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showImportModal, setShowImportModal] = useState(false);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [storedPatients, setStoredPatients] = useState<Patient[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const startGame = useGameStore(state => state.startGame);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setRecords(getGameRecords());
    setStoredPatients(getStoredPatients());
  };

  const handleStartGame = () => {
    if (storedPatients.length > 0) {
      startGame(storedPatients);
    } else {
      startGame();
    }
    navigate('/game');
  };

  const handleImportSuccess = (result: ImportResult) => {
    setImportResult(result);
    loadData();
    setTimeout(() => setImportResult(null), 3000);
  };

  const handleReplay = (record: GameRecord) => {
    navigate(`/result?recordId=${record.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-6">
            <Activity size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            急诊分诊队列赛
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            模拟真实急诊场景，训练您根据患者症状、候诊时长和诊室资源进行队列重排的决策能力
          </p>
        </div>

        {importResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <p className="text-green-700">
              导入成功！新增 {importResult.added} 条，跳过 {importResult.skipped} 条
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <button
            onClick={handleStartGame}
            className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 text-left"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Play size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">开始培训</h3>
            <p className="text-gray-500">
              {storedPatients.length > 0 
                ? `使用已导入的 ${storedPatients.length} 名患者数据开始游戏`
                : '使用默认病例数据开始游戏'
              }
            </p>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 text-left"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">导入数据</h3>
            <p className="text-gray-500">
              导入自定义患者病例数据，支持忽略、覆盖、追加三种模式
            </p>
          </button>

          <div className="p-8 bg-white rounded-2xl shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Database size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">数据管理</h3>
            <p className="text-gray-500 mb-3">
              当前已存储 {storedPatients.length} 条患者数据
            </p>
            {storedPatients.length > 0 && (
              <div className="text-xs text-gray-400">
                优先级分布：
                {storedPatients.filter(p => p.currentPriority === 'critical').length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded">
                    危重 {storedPatients.filter(p => p.currentPriority === 'critical').length}
                  </span>
                )}
                {storedPatients.filter(p => p.currentPriority === 'urgent').length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded">
                    急症 {storedPatients.filter(p => p.currentPriority === 'urgent').length}
                  </span>
                )}
                {storedPatients.filter(p => p.currentPriority === 'normal').length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded">
                    普通 {storedPatients.filter(p => p.currentPriority === 'normal').length}
                  </span>
                )}
                {storedPatients.filter(p => p.currentPriority === 'low').length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-600 rounded">
                    轻症 {storedPatients.filter(p => p.currentPriority === 'low').length}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
              <Info size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2">游戏说明</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 拖拽患者卡片调整队列顺序，优先处理危重患者</li>
                <li>• 点击患者卡片，再点击空闲诊室进行分配</li>
                <li>• 注意等待超时警告，避免患者等待时间过长</li>
                <li>• 复评事件会改变患者优先级，需及时调整队列</li>
                <li>• 危重漏分将严重影响得分，请特别注意红色标记的患者</li>
              </ul>
            </div>
          </div>
        </div>

        <HistoryList records={records} onDelete={loadData} onReplay={handleReplay} />
      </div>

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default HomePage;
