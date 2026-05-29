import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileBarChart, Home, RotateCcw } from 'lucide-react';
import StationScene from '../components/StationScene';
import ControlPanel from '../components/ControlPanel';
import IssuePanel from '../components/IssuePanel';
import { useAppStore } from '../store';

const AnalyzerPage: React.FC = () => {
  const navigate = useNavigate();
  const { floors, stationName, isDataLoaded, getBlockedEscalatorCount } = useAppStore();

  useEffect(() => {
    if (!isDataLoaded && floors.length === 0) {
      navigate('/');
    }
  }, [isDataLoaded, floors.length, navigate]);

  const blockedCount = getBlockedEscalatorCount();

  return (
    <div className="w-full h-full flex flex-col bg-primary-900">
      <header className="h-14 glass-panel border-b border-blue-500/20 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <div className="h-6 w-px bg-blue-500/30" />
          <h1 className="font-display font-semibold text-white">
            {stationName || '未命名站点'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {blockedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg glow-warning">
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300 font-medium">
                扶梯容量错误已拦截: {blockedCount}
              </span>
            </div>
          )}
          
          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-blue-500/30"
          >
            <FileBarChart className="w-4 h-4" />
            生成报告
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />
        
        <div className="flex-1 relative">
          <StationScene />
          
          <div className="absolute top-4 left-4 glass-panel rounded-lg px-3 py-2">
            <p className="text-xs text-blue-200/60">操作提示</p>
            <p className="text-xs text-blue-300 mt-1">
              左键旋转 | 右键平移 | 滚轮缩放 | 点击楼层选中
            </p>
          </div>

          <div className="absolute bottom-4 left-4 glass-panel rounded-lg px-3 py-2">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-blue-200/80">正常</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-blue-200/80">警告</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-blue-200/80">过载</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-blue-200/80">客流</span>
              </div>
            </div>
          </div>
        </div>

        <IssuePanel />
      </div>
    </div>
  );
};

export default AnalyzerPage;
