import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Star, Upload, AlertCircle, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Level, ImportStrategy } from '../types';
import { DIFFICULTY_LABELS, ZONE_LABELS } from '../types';
import { getLevels, importLevels, getRecords, saveLevels } from '../utils/storage';
import { useGameStore } from '../store/gameStore';

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

export default function LevelSelect() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [levels, setLevels] = useState<Level[]>(getLevels());
  const [records] = useState(getRecords());
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Level[] | null>(null);
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('skip');
  const { startGame, addToast } = useGameStore();

  const handleStartGame = (level: Level) => {
    startGame(level);
    navigate(`/game/${level.id}`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const levelsToImport = Array.isArray(data) ? data : [data];
        setImportPreview(levelsToImport);
        setShowImportModal(true);
      } catch {
        addToast({
          type: 'error',
          message: '文件解析失败，请检查JSON格式',
          duration: 3000,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;

    const result = importLevels(importPreview, importStrategy);
    setLevels(getLevels());
    setShowImportModal(false);
    setImportPreview(null);

    addToast({
      type: 'success',
      message: `导入完成：新增 ${result.added} 个，更新 ${result.updated} 个，跳过 ${result.skipped} 个`,
      duration: 4000,
    });
  };

  const handleDeleteLevel = (levelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedLevels = levels.filter((l) => l.id !== levelId);
    saveLevels(updatedLevels);
    setLevels(updatedLevels);
    addToast({
      type: 'success',
      message: '关卡已删除',
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            🚛 冷链车装载闯关
          </h1>
          <p className="text-gray-600 text-lg">
            掌握冷链运输温度控制原则，成为专业的冷链物流司机
          </p>
        </motion.div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">选择关卡</h2>
            <p className="text-gray-500">共 {levels.length} 个关卡</p>
          </div>
          <button onClick={handleImportClick} className="btn-primary flex items-center gap-2">
            <Upload size={20} />
            导入材料
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level, index) => {
            const record = records[level.id];
            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 hover:shadow-xl transition-all duration-300 group relative"
              >
                {level.source !== '系统默认' && (
                  <button
                    onClick={(e) => handleDeleteLevel(level.id, e)}
                    className="absolute top-3 right-3 p-2 text-gray-400 hover:text-status-error hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                      {level.name}
                    </h3>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[level.difficulty]}`}
                    >
                      {DIFFICULTY_LABELS[level.difficulty]}
                    </span>
                  </div>
                  {record && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={16} fill="currentColor" />
                        <span className="font-bold">{record.bestScore}</span>
                      </div>
                      <div className="text-xs text-gray-500">最佳成绩</div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={16} />
                    <span className="text-sm">
                      时间限制：{Math.floor(level.timeLimit / 60)}分{level.timeLimit % 60}秒
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Info size={16} />
                    <span className="text-sm">
                      货箱数量：{level.cargoBoxes.length} 个
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-sm">
                      温层：
                      {Object.entries(
                        level.cargoBoxes.reduce((acc, cargo) => {
                          acc[cargo.zone] = (acc[cargo.zone] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([zone, count]) => (
                        <span key={zone} className="ml-1">
                          {ZONE_LABELS[zone as keyof typeof ZONE_LABELS]}×{count}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span>来源：{level.source}</span>
                  <span>版本 v{level.version}</span>
                </div>

                <button
                  onClick={() => handleStartGame(level)}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  {record ? '再次挑战' : '开始挑战'}
                </button>
              </motion.div>
            );
          })}
        </div>

        {levels.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 text-lg mb-4">暂无关卡，请导入材料</p>
            <button onClick={handleImportClick} className="btn-primary">
              导入JSON材料
            </button>
          </div>
        )}
      </div>

      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">导入确认</h3>

            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                即将导入 <span className="font-semibold">{importPreview.length}</span> 个关卡
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {importPreview.map((level, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium">{level.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${difficultyColors[level.difficulty]}`}>
                      {DIFFICULTY_LABELS[level.difficulty]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 font-medium mb-3">冲突处理策略</p>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="strategy"
                    value="skip"
                    checked={importStrategy === 'skip'}
                    onChange={(e) => setImportStrategy(e.target.value as ImportStrategy)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">忽略</p>
                    <p className="text-sm text-gray-500">保留已有关卡，跳过相同ID的关卡</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="strategy"
                    value="overwrite"
                    checked={importStrategy === 'overwrite'}
                    onChange={(e) => setImportStrategy(e.target.value as ImportStrategy)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">覆盖</p>
                    <p className="text-sm text-gray-500">用新数据覆盖已有相同ID的关卡</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="strategy"
                    value="append"
                    checked={importStrategy === 'append'}
                    onChange={(e) => setImportStrategy(e.target.value as ImportStrategy)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">追加</p>
                    <p className="text-sm text-gray-500">生成新ID，将所有关卡作为新关卡添加</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button onClick={handleConfirmImport} className="flex-1 btn-primary">
                确认导入
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
