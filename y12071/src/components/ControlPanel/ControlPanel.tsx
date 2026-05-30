import { Play, RotateCcw, UserPlus, Eye, EyeOff, Scissors, BarChart3, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function ControlPanel() {
  const { 
    scenario, 
    detection, 
    ui,
    runFirstDetection, 
    runSecondDetection, 
    resetDetection,
    addPersonnelRoute,
    setShowLabels,
    setShowSectionPlane,
    setCompareMode,
  } = useStore();

  const handleStartDetection = async () => {
    if (detection.firstPassResults.length === 0) {
      runFirstDetection();
    } else if (!detection.hasPersonnelRoute) {
      addPersonnelRoute();
      setTimeout(() => runSecondDetection(), 300);
    } else {
      await runSecondDetection();
    }
  };

  const getButtonText = () => {
    if (detection.isDetecting) return '检测中...';
    if (detection.firstPassResults.length === 0) return '开始检测';
    if (!detection.hasPersonnelRoute) return '补录人员路线并复检';
    return '重新检测';
  };

  const getButtonIcon = () => {
    if (detection.isDetecting) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (detection.firstPassResults.length === 0) return <Play className="w-4 h-4" />;
    if (!detection.hasPersonnelRoute) return <UserPlus className="w-4 h-4" />;
    return <Play className="w-4 h-4" />;
  };

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          矿洞安全支护模型
        </h1>
        <p className="text-xs text-slate-400 mt-1">{scenario.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{scenario.description}</p>
      </div>

      <div className="p-4 border-b border-slate-700">
        <div className="text-sm font-semibold text-slate-300 mb-3">检测流程</div>
        
        <div className="space-y-2 mb-4">
          <div className={`flex items-center gap-2 text-sm ${
            detection.firstPassResults.length > 0 ? 'text-green-400' : 'text-slate-500'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              detection.firstPassResults.length > 0 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              1
            </div>
            <span>基础模型检测</span>
            {detection.firstPassResults.length > 0 && <span className="text-xs">✓</span>}
          </div>
          
          <div className={`flex items-center gap-2 text-sm ${
            detection.hasPersonnelRoute ? 'text-blue-400' : 'text-slate-500'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              detection.hasPersonnelRoute 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              2
            </div>
            <span>补录人员路线</span>
            {detection.hasPersonnelRoute && <span className="text-xs">✓</span>}
          </div>
          
          <div className={`flex items-center gap-2 text-sm ${
            detection.secondPassResults.length > 0 ? 'text-green-400' : 'text-slate-500'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              detection.secondPassResults.length > 0 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              3
            </div>
            <span>二次检测对比</span>
            {detection.secondPassResults.length > 0 && <span className="text-xs">✓</span>}
          </div>
        </div>

        <button
          onClick={handleStartDetection}
          disabled={detection.isDetecting}
          className={`w-full py-2.5 px-4 rounded font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            detection.isDetecting
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {getButtonIcon()}
          {getButtonText()}
        </button>

        <button
          onClick={resetDetection}
          className="w-full mt-2 py-2 px-4 rounded font-medium text-sm flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          重置演示
        </button>
      </div>

      <div className="p-4 border-b border-slate-700">
        <div className="text-sm font-semibold text-slate-300 mb-3">视图控制</div>
        
        <div className="space-y-2">
          <button
            onClick={() => setShowLabels(!ui.showLabels)}
            className={`w-full py-2 px-3 rounded text-sm flex items-center justify-between transition-all ${
              ui.showLabels 
                ? 'bg-blue-900 text-blue-200 border border-blue-700' 
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {ui.showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              显示标注
            </span>
            <span className={`w-8 h-4 rounded-full transition-all ${
              ui.showLabels ? 'bg-blue-500' : 'bg-slate-600'
            }`}>
              <span className={`block w-3 h-3 rounded-full bg-white mt-0.5 transition-all ${
                ui.showLabels ? 'ml-4' : 'ml-0.5'
              }`} />
            </span>
          </button>

          <button
            onClick={() => setShowSectionPlane(!ui.showSectionPlane)}
            className={`w-full py-2 px-3 rounded text-sm flex items-center justify-between transition-all ${
              ui.showSectionPlane 
                ? 'bg-blue-900 text-blue-200 border border-blue-700' 
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Scissors className="w-4 h-4" />
              剖切平面
            </span>
            <span className={`w-8 h-4 rounded-full transition-all ${
              ui.showSectionPlane ? 'bg-blue-500' : 'bg-slate-600'
            }`}>
              <span className={`block w-3 h-3 rounded-full bg-white mt-0.5 transition-all ${
                ui.showSectionPlane ? 'ml-4' : 'ml-0.5'
              }`} />
            </span>
          </button>

          <button
            onClick={() => setCompareMode(!ui.compareMode)}
            disabled={detection.secondPassResults.length === 0}
            className={`w-full py-2 px-3 rounded text-sm flex items-center justify-between transition-all ${
              ui.compareMode 
                ? 'bg-blue-900 text-blue-200 border border-blue-700' 
                : detection.secondPassResults.length === 0
                ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              对比模式
            </span>
            <span className={`w-8 h-4 rounded-full transition-all ${
              ui.compareMode ? 'bg-blue-500' : 'bg-slate-600'
            }`}>
              <span className={`block w-3 h-3 rounded-full bg-white mt-0.5 transition-all ${
                ui.compareMode ? 'ml-4' : 'ml-0.5'
              }`} />
            </span>
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <div className="text-sm font-semibold text-slate-300 mb-3">检测统计</div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <div className="text-2xl font-bold text-red-400">
              {detection.secondPassResults.filter(r => r.severity === 'high').length || 
               detection.firstPassResults.filter(r => r.severity === 'high').length || 0}
            </div>
            <div className="text-xs text-slate-400">高危</div>
          </div>
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <div className="text-2xl font-bold text-orange-400">
              {detection.secondPassResults.filter(r => r.severity === 'medium').length ||
               detection.firstPassResults.filter(r => r.severity === 'medium').length || 0}
            </div>
            <div className="text-xs text-slate-400">中危</div>
          </div>
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <div className="text-2xl font-bold text-yellow-400">
              {detection.secondPassResults.filter(r => r.severity === 'low').length ||
               detection.firstPassResults.filter(r => r.severity === 'low').length || 0}
            </div>
            <div className="text-xs text-slate-400">低危</div>
          </div>
          <div className="bg-slate-800 rounded p-3 border border-slate-700">
            <div className="text-2xl font-bold text-blue-400">
              {detection.secondPassResults.filter(r => r.affectedByRoute).length}
            </div>
            <div className="text-xs text-slate-400">受路线影响</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>检测次数:</span>
            <span>{detection.detectionCount}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>人员路线:</span>
            <span>{detection.hasPersonnelRoute ? '已加载' : '未加载'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          支持截图导出 · 结果可重复验证
        </div>
      </div>
    </div>
  );
}
