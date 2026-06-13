import { useState, useEffect } from 'react';
import { Play, RotateCcw, FileText, Settings, ChevronDown, Activity, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useParamStore } from '@/store/useParamStore';
import { useDataStore } from '@/store/useDataStore';
import { recalculateAllData } from '@/utils/attribution';
import ReportPreview from '@/components/ReportPreview/ReportPreview';

export default function TopBar() {
  const { versions, currentVersion, setCurrentVersion, getCurrentVersionData } = useParamStore();
  const { buoyData, runStatus, runProgress, startRun, updateRunProgress, completeRun, setBuoyData } = useDataStore();
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [runMessage, setRunMessage] = useState('');

  const currentVersionData = getCurrentVersionData();

  useEffect(() => {
    if (runStatus === 'running') {
      let progress = 0;
      const steps = [
        '加载原始数据...',
        '解析数据格式...',
        '校验数据有效性...',
        '应用误差归因公式...',
        '执行异常检测...',
        '关联维修备注...',
        '生成分析结果...',
      ];

      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          if (currentVersionData) {
            const newData = recalculateAllData(buoyData, currentVersionData);
            setBuoyData(newData);
          }
          
          completeRun();
          setRunMessage('分析完成');
          setTimeout(() => setRunMessage(''), 3000);
        } else {
          updateRunProgress(Math.min(progress, 99));
          const stepIndex = Math.floor((progress / 100) * steps.length);
          setRunMessage(steps[Math.min(stepIndex, steps.length - 1)]);
        }
      }, 400);

      return () => clearInterval(interval);
    }
  }, [runStatus, currentVersionData, buoyData, completeRun, updateRunProgress, setBuoyData]);

  const handleVersionChange = (version: string) => {
    setCurrentVersion(version);
    setShowVersionDropdown(false);
  };

  const handleStart = () => {
    startRun();
    setRunMessage('正在启动分析...');
  };

  const handleRerun = () => {
    startRun();
    setRunMessage('正在重新计算...');
  };

  const stats = {
    total: buoyData.length,
    normal: buoyData.filter((d) => d.status === 'normal').length,
    warning: buoyData.filter((d) => d.status === 'warning').length,
    error: buoyData.filter((d) => d.status === 'error').length,
  };

  return (
    <>
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-glow to-ocean-blue flex items-center justify-center shadow-lg shadow-cyan-glow/20">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-success-green rounded-full border-2 border-slate-900 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">海浪浮标误差归因系统</h1>
                <p className="text-xs text-slate-400">海洋监测数据质量分析平台</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700"></div>

            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-green/10">
                <div className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></div>
                <span className="text-success-green font-medium">在线</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <span>总数: <span className="text-white font-mono">{stats.total}</span></span>
                <span>正常: <span className="text-success-green font-mono">{stats.normal}</span></span>
                <span>警告: <span className="text-warning-orange font-mono">{stats.warning}</span></span>
                <span>异常: <span className="text-error-red font-mono">{stats.error}</span></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {runStatus !== 'idle' && (
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                {runStatus === 'running' && (
                  <Loader2 className="w-4 h-4 text-cyan-glow animate-spin" />
                )}
                {runStatus === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-success-green" />
                )}
                {runStatus === 'failed' && (
                  <AlertCircle className="w-4 h-4 text-error-red" />
                )}
                <div className="flex flex-col">
                  <span className={`text-xs font-medium ${
                    runStatus === 'running' ? 'text-cyan-glow' :
                    runStatus === 'completed' ? 'text-success-green' : 'text-error-red'
                  }`}>
                    {runMessage || (
                      runStatus === 'running' ? '分析中...' :
                      runStatus === 'completed' ? '已完成' : '失败'
                    )}
                  </span>
                  {runStatus === 'running' && (
                    <div className="w-32 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-cyan-glow transition-all duration-300"
                        style={{ width: `${runProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-all group"
              >
                <Settings className="w-4 h-4 text-slate-400 group-hover:text-cyan-glow transition-colors" />
                <div className="text-left">
                  <div className="text-xs text-slate-500">参数版本</div>
                  <div className="text-sm text-white font-medium">{currentVersion}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showVersionDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showVersionDropdown && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                  <div className="p-2">
                    {versions.map((version) => (
                      <button
                        key={version.version}
                        onClick={() => handleVersionChange(version.version)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          currentVersion === version.version
                            ? 'bg-cyan-glow/10 border border-cyan-glow/30'
                            : 'hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium ${
                            currentVersion === version.version ? 'text-cyan-glow' : 'text-white'
                          }`}>
                            {version.version}
                          </span>
                          {currentVersion === version.version && (
                            <span className="px-2 py-0.5 rounded text-xs bg-cyan-glow/20 text-cyan-glow">
                              当前
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-1">{version.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <code className="px-1.5 py-0.5 bg-slate-900/50 rounded font-mono">
                            {version.formula}
                          </code>
                        </div>
                        <div className="text-xs text-slate-600 mt-1">{version.createdAt}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-700"></div>

            <button
              onClick={handleStart}
              disabled={runStatus === 'running'}
              className="flex items-center gap-2 px-5 py-2 bg-success-green hover:bg-success-green/90 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg shadow-success-green/20"
            >
              <Play className="w-4 h-4" />
              启动分析
            </button>

            <button
              onClick={handleRerun}
              disabled={runStatus === 'running'}
              className="flex items-center gap-2 px-5 py-2 bg-cyan-glow hover:bg-cyan-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-deep-ocean font-medium rounded-lg transition-all shadow-lg shadow-cyan-glow/20"
            >
              <RotateCcw className={`w-4 h-4 ${runStatus === 'running' ? 'animate-spin' : ''}`} />
              重跑
            </button>

            <button
              onClick={() => setShowReportPreview(true)}
              className="flex items-center gap-2 px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all"
            >
              <FileText className="w-4 h-4" />
              查看Markdown报告
            </button>
          </div>
        </div>
      </div>

      {showReportPreview && (
        <ReportPreview onClose={() => setShowReportPreview(false)} />
      )}
    </>
  );
}
