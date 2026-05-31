import {
  Box,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function Header() {
  const { damModel, riskAssessment, anomalies, loadMockData } = useAppStore();

  const getRiskColor = () => {
    switch (riskAssessment) {
      case 'safe':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-orange-500';
      case 'critical':
        return 'bg-red-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskText = () => {
    switch (riskAssessment) {
      case 'safe':
        return '安全';
      case 'warning':
        return '警告';
      case 'danger':
        return '危险';
      case 'critical':
        return '紧急';
      default:
        return '未知';
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">水库坝体渗流剖面3D工作台</h1>
            <p className="text-gray-400 text-[10px]">{damModel.name}</p>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-700" />
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getRiskColor()}`} />
          <span className="text-white text-xs">
            风险等级: <span className="font-bold">{getRiskText()}</span>
          </span>
        </div>
        {anomalies.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-600/50 rounded">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span className="text-red-400 text-xs font-medium">{anomalies.length} 项异常</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={loadMockData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          加载示例数据
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
          重置视图
        </button>
        <button className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
          <Info className="w-4 h-4" />
        </button>
        <button className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
