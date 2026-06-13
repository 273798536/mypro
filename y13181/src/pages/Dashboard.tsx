import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, AlertTriangle, Clock, FileX, MessageSquare, Package, CheckCircle, X, ChevronRight, Zap } from 'lucide-react';
import { useDataStore } from '@/stores/useDataStore';
import { cn } from '@/lib/utils';

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  onClick?: () => void;
}> = ({ icon, label, value, color, bgColor, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      'glass-card rounded-xl p-5 transition-all duration-300 cursor-pointer',
      'hover:border-white/15 hover:shadow-lg hover:-translate-y-0.5'
    )}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', bgColor)}>
        {icon}
      </div>
      <span className="text-2xl font-bold font-mono">{value}</span>
    </div>
    <div className={cn('text-sm font-medium', color)}>{label}</div>
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { getStatsSummary, isRunning, runProgress, runFullReview, noiseBlockingPoints } = useDataStore();
  const stats = getStatsSummary();
  const [showExitTip, setShowExitTip] = useState(false);
  
  const handleRunReview = async () => {
    setShowExitTip(false);
    await runFullReview();
    setShowExitTip(true);
  };
  
  useEffect(() => {
    if (!isRunning && runProgress === 100 && noiseBlockingPoints.length > 0) {
      setShowExitTip(true);
    }
  }, [isRunning, runProgress, noiseBlockingPoints]);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">冷却塔水滴阈值预警复核</h1>
          <p className="text-sm text-gray-400">一键整包复核，全链路标记追溯</p>
        </div>
      </div>
      
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-glow/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">整包复核</h2>
            <p className="text-sm text-gray-400 mb-4 max-w-md">
              一键运行全部复核流程，自动标记疑似噪声、旧版备注、名称不一致和口头备注等异常
            </p>
            
            {isRunning ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-teal-glow border-t-transparent animate-spin" />
                  <span className="text-sm text-teal-glow">复核进行中...</span>
                  <span className="text-sm font-mono text-gray-400 ml-auto">{runProgress}%</span>
                </div>
                <div className="h-2 bg-deep-blue-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-glow to-teal-glow/60 transition-all duration-300 ease-out"
                    style={{ width: `${runProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleRunReview}
                className={cn(
                  'group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl',
                  'bg-gradient-to-r from-teal-glow to-teal-glow/80',
                  'text-deep-blue-900 font-semibold text-base',
                  'shadow-lg shadow-teal-glow/20',
                  'hover:shadow-teal-glow/30 hover:scale-[1.02]',
                  'active:scale-[0.98]',
                  'transition-all duration-300'
                )}
              >
                <Play className="w-5 h-5" />
                开始整包复核
                <Zap className="w-4 h-4 opacity-70" />
              </button>
            )}
          </div>
          
          <div className="hidden md:block">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-teal-glow/20 to-teal-glow/5 flex items-center justify-center border border-teal-glow/20">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono text-teal-glow">{stats.total}</div>
                <div className="text-xs text-gray-400 mt-1">条数据</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showExitTip && noiseBlockingPoints.length > 0 && (
        <div className="glass-card rounded-xl p-5 border-orange-alert/30 bg-orange-alert/5 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-alert/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-alert" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-alert mb-2">
                复核完成 - 极端值疑似噪声卡点提示
              </h3>
              <div className="space-y-1.5">
                {noiseBlockingPoints.slice(0, 5).map((point, idx) => (
                  <div key={idx} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-orange-alert/60" />
                    {point}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  navigate('/list');
                  useDataStore.getState().setFilters({ markType: 'noise' });
                }}
                className="mt-3 text-xs text-teal-glow hover:text-teal-glow-400 inline-flex items-center gap-1"
              >
                查看全部疑似噪声
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => setShowExitTip(false)}
              className="text-gray-500 hover:text-gray-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-orange-alert" />}
          label="疑似噪声"
          value={stats.noiseSuspected}
          color="text-orange-alert"
          bgColor="bg-orange-alert/15"
          onClick={() => {
            navigate('/list');
            useDataStore.getState().setFilters({ markType: 'noise' });
          }}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-gray-400" />}
          label="旧版备注"
          value={stats.oldNote}
          color="text-gray-400"
          bgColor="bg-gray-500/15"
          onClick={() => {
            navigate('/list');
            useDataStore.getState().setFilters({ markType: 'old_note' });
          }}
        />
        <StatCard
          icon={<FileX className="w-5 h-5 text-amber-warn" />}
          label="名称不一致"
          value={stats.nameMismatch}
          color="text-amber-warn"
          bgColor="bg-amber-warn/15"
          onClick={() => {
            navigate('/list');
            useDataStore.getState().setFilters({ markType: 'name_mismatch' });
          }}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-purple-verbal" />}
          label="口头备注"
          value={stats.verbalNote}
          color="text-purple-verbal"
          bgColor="bg-purple-verbal/15"
          onClick={() => {
            navigate('/list');
            useDataStore.getState().setFilters({ markType: 'verbal_note' });
          }}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">状态分布</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-teal-glow" />
              <span className="text-sm text-gray-400 flex-1">正常</span>
              <span className="text-sm font-mono text-white">{stats.normal}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-warn" />
              <span className="text-sm text-gray-400 flex-1">预警</span>
              <span className="text-sm font-mono text-white">{stats.warning}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-alert" />
              <span className="text-sm text-gray-400 flex-1">临界</span>
              <span className="text-sm font-mono text-white">{stats.critical}</span>
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">处理进度</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-teal-glow" />
              <span className="text-sm text-gray-400 flex-1">已处理</span>
              <span className="text-sm font-mono text-white">{stats.processed}</span>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400 flex-1">待补材料</span>
              <span className="text-sm font-mono text-white">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">└</span>
              <span className="text-sm text-gray-400 flex-1">人工改判</span>
              <span className="text-sm font-mono text-white">{stats.manualJudged}</span>
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">快捷操作</h3>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/list')}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-between group"
            >
              查看全部数据
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => navigate('/recalc')}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-between group"
            >
              复算对比验证
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => navigate('/export')}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-between group"
            >
              导出发送说明
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
