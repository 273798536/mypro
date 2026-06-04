import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FunctionSquare, AlertCircle } from 'lucide-react';
import { GridCanvas } from '@/components/GridCanvas';
import { Toolbar } from '@/components/Toolbar';
import { AnnotationPanel } from '@/components/AnnotationPanel';
import { getLevelById } from '@/data/levels';
import { useExperimentStore, useHistoryStore } from '@/store/experimentStore';

const Experiment: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { boundaryFailed, setCurrentLevel, currentLevelId } = useExperimentStore();
  const { undo, redo } = useHistoryStore();
  const [canvasSize, setCanvasSize] = useState({ width: 700, height: 560 });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }, [undo, redo]);

  useEffect(() => {
    if (levelId && (!currentLevelId || currentLevelId !== levelId)) {
      setCurrentLevel(levelId);
    }
  }, [levelId, currentLevelId, setCurrentLevel]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const level = levelId ? getLevelById(levelId) : null;

  useEffect(() => {
    const updateSize = () => {
      const containerWidth = Math.min(window.innerWidth - 520, 800);
      const width = Math.max(containerWidth, 600);
      const height = Math.min(width * 0.8, 600);
      setCanvasSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  if (!level) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-[#EC4899] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0F3B5F] mb-2">关卡不存在</h2>
          <p className="text-slate-600 mb-4">请返回首页选择正确的关卡</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#0F3B5F] text-white rounded hover:bg-opacity-90 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <header className="bg-white border-b border-slate-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-600 hover:text-[#0F3B5F] transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">返回首页</span>
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <div className="flex items-center gap-3">
              <FunctionSquare size={24} className="text-[#0F3B5F]" />
              <div>
                <h1
                  className="text-xl font-bold text-[#0F3B5F]"
                  style={{ fontFamily: '"Playfair Display", serif' }}
                >
                  {level.name}
                </h1>
                <p className="text-xs text-slate-500">
                  目标函数：
                  <code className="ml-1 bg-slate-100 px-2 py-0.5 rounded font-mono">
                    {level.targetFunction}
                  </code>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="text-slate-500">
              边界：[±{level.boundary.x}, ±{level.boundary.y}]
            </div>
            {boundaryFailed && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EC4899] bg-opacity-10 text-[#EC4899] rounded border border-[#EC4899] border-opacity-30">
                <AlertCircle size={16} />
                <span className="font-medium">边界失败</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className="w-56 flex-shrink-0">
            <Toolbar />
          </div>

          <div className="flex-1 flex flex-col items-center">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <GridCanvas width={canvasSize.width} height={canvasSize.height} />
            </div>

            <div className="mt-4 text-center text-sm text-slate-500 max-w-xl">
              <p>
                <span className="font-medium text-[#0F3B5F]">提示：</span>
                在画布上点击并拖动以绘制。曲线工具用于绘制函数轨迹，
                填充工具用于绘制封闭区域。双击可提前结束绘制。
              </p>
              <p className="mt-1 text-xs">
                快捷键：<kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">Ctrl+Z</kbd> 撤销，
                <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-xs ml-1">Ctrl+Y</kbd> 重做
              </p>
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <AnnotationPanel />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Experiment;
