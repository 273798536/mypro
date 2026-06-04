import React, { useState } from 'react';
import {
  Pencil,
  PaintBucket,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Check,
  Home,
  AlertTriangle
} from 'lucide-react';
import { useExperimentStore, useHistoryStore } from '@/store/experimentStore';
import { ToolType } from '@/types';
import { downloadJSON, generateExportData } from '@/utils/export';
import { getLevelById } from '@/data/levels';
import { useNavigate } from 'react-router-dom';

const COLORS = [
  '#2DD4BF', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6', '#10B981'
];

const TOOLS: { type: ToolType; icon: React.ReactNode; label: string }[] = [
  { type: 'draw', icon: <Pencil size={20} />, label: '绘制曲线' },
  { type: 'fill', icon: <PaintBucket size={20} />, label: '填充区域' }
];

export const Toolbar: React.FC = () => {
  const navigate = useNavigate();
  const [showFinishModal, setShowFinishModal] = useState(false);
  
  const {
    currentTool,
    currentLevelId,
    selectedColor,
    annotations,
    boundaryFailed,
    setCurrentTool,
    setSelectedColor,
    resetLevel,
    addResult
  } = useExperimentStore();

  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const currentLevel = currentLevelId ? getLevelById(currentLevelId) : null;
  const boundary = currentLevel?.boundary || { x: 5, y: 5 };

  const handleExport = () => {
    if (!currentLevelId) return;
    
    const exportData = generateExportData(
      currentLevelId,
      annotations,
      boundary,
      boundaryFailed
    );
    
    downloadJSON(exportData);
  };

  const handleFinishLevel = () => {
    if (!currentLevelId) return;
    
    const exportData = generateExportData(
      currentLevelId,
      annotations,
      boundary,
      boundaryFailed
    );

    const result = {
      id: `${Date.now()}`,
      levelId: currentLevelId,
      passed: exportData.summary.pendingCount === 0 && !boundaryFailed,
      annotations: exportData.annotations,
      validCount: exportData.summary.validCount,
      pendingCount: exportData.summary.pendingCount,
      exportData,
      completedAt: Date.now()
    };

    addResult(result);
    setShowFinishModal(false);
    navigate('/result');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-4">
      <div className="border-b border-slate-200 pb-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-3" style={{ fontFamily: '"Fira Code", monospace' }}>
          工具
        </h3>
        <div className="flex flex-col gap-2">
          {TOOLS.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => setCurrentTool(type)}
              className={`flex items-center gap-3 px-3 py-2 rounded border transition-all duration-200 ${
                currentTool === type
                  ? 'bg-[#0F3B5F] text-white border-[#0F3B5F]'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-[#0F3B5F] hover:-translate-y-0.5 hover:shadow-sm'
              }`}
              title={label}
            >
              {icon}
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-200 pb-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-3" style={{ fontFamily: '"Fira Code", monospace' }}>
          颜色
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded border-2 transition-all duration-200 ${
                selectedColor === color
                  ? 'border-[#0F3B5F] scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="border-b border-slate-200 pb-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-3" style={{ fontFamily: '"Fira Code", monospace' }}>
          操作
        </h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="flex items-center gap-3 px-3 py-2 rounded border border-slate-300 text-slate-600 hover:border-[#0F3B5F] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <Undo2 size={20} />
            <span className="text-sm">撤销</span>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="flex items-center gap-3 px-3 py-2 rounded border border-slate-300 text-slate-600 hover:border-[#0F3B5F] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <Redo2 size={20} />
            <span className="text-sm">重做</span>
          </button>
          <button
            onClick={resetLevel}
            className="flex items-center gap-3 px-3 py-2 rounded border border-slate-300 text-slate-600 hover:border-[#EC4899] hover:text-[#EC4899] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
          >
            <RotateCcw size={20} />
            <span className="text-sm">重开本关</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {boundaryFailed && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#EC4899] bg-opacity-10 text-[#EC4899] rounded border border-[#EC4899] border-opacity-30">
            <AlertTriangle size={18} />
            <span className="text-xs font-medium">边界失败！请在范围内绘制</span>
          </div>
        )}
        <button
          onClick={handleExport}
          disabled={annotations.length === 0}
          className="flex items-center gap-3 px-3 py-2 rounded border border-[#0F3B5F] bg-[#0F3B5F] text-white hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          <Download size={20} />
          <span className="text-sm">导出JSON</span>
        </button>
        <button
          onClick={() => setShowFinishModal(true)}
          disabled={annotations.length === 0}
          className="flex items-center gap-3 px-3 py-2 rounded border border-[#2DD4BF] bg-[#2DD4BF] text-white hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          <Check size={20} />
          <span className="text-sm">完成关卡</span>
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-3 py-2 rounded border border-slate-300 text-slate-600 hover:border-[#0F3B5F] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
        >
          <Home size={20} />
          <span className="text-sm">返回首页</span>
        </button>
      </div>

      {showFinishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
          <h3 className="text-xl font-bold text-[#0F3B5F] mb-4" style={{ fontFamily: '"Playfair Display", serif' }}>
            确认完成关卡？
          </h3>
          <p className="text-slate-600 mb-6">
            当前关卡共有 <span className="font-bold">{annotations.length}</span> 个标注。
            完成后将进入结算页面。
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowFinishModal(false)}
              className="px-4 py-2 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleFinishLevel}
              className="px-4 py-2 rounded bg-[#2DD4BF] text-white hover:bg-opacity-90 transition-colors"
            >
              确认完成
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
