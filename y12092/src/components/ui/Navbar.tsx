import { Link, useLocation } from 'react-router-dom';
import { 
  MonitorPlay, 
  GitMerge, 
  FileText, 
  Camera as CameraIcon,
  Scan,
  AlertTriangle,
  Eye,
  Layers,
  Tag
} from 'lucide-react';
import { useAppStore } from '@/store';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const location = useLocation();
  const { 
    cameras, 
    conflicts, 
    isDetectingConflicts, 
    detectAllConflicts,
    showFrustums,
    showLabels,
    showRoutes,
    setShowFrustums,
    setShowLabels,
    setShowRoutes,
    clearFocus,
  } = useAppStore();
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      detectAllConflicts();
    }
  }, [mounted, detectAllConflicts]);
  
  const pendingConflicts = conflicts.filter(c => c.status === 'pending');
  const criticalConflicts = pendingConflicts.filter(c => c.severity === 'critical');
  
  const navItems = [
    { path: '/', label: '主工作台', icon: <MonitorPlay className="w-4 h-4" /> },
    { path: '/merge', label: '数据合并', icon: <GitMerge className="w-4 h-4" /> },
    { path: '/report', label: '冲突报告', icon: <FileText className="w-4 h-4" /> },
    { path: '/screenshot', label: '演示截图', icon: <CameraIcon className="w-4 h-4" /> },
  ];
  
  return (
    <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-6 flex-shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
          <Scan className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-sm">赛事转播机位预排</h1>
          <p className="text-gray-500 text-xs">Camera Planning System</p>
        </div>
      </div>
      
      <nav className="flex items-center gap-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => clearFocus()}
            className={`
              flex items-center gap-2 px-3 py-2 rounded text-sm transition-all
              ${location.pathname === item.path 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
              }
            `}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setShowFrustums(!showFrustums)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded border transition-all ${
            showFrustums 
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          视锥
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded border transition-all ${
            showLabels 
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          标签
        </button>
        <button
          onClick={() => setShowRoutes(!showRoutes)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded border transition-all ${
            showRoutes 
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          路线
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <CameraIcon className="w-3.5 h-3.5" />
            {cameras.length} 机位
          </span>
          <span className={`flex items-center gap-1 ${criticalConflicts.length > 0 ? 'text-red-400' : ''}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {pendingConflicts.length} 待处理
            {criticalConflicts.length > 0 && (
              <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {criticalConflicts.length}
              </span>
            )}
          </span>
        </div>
        
        <button
          onClick={detectAllConflicts}
          disabled={isDetectingConflicts}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm rounded transition-all border border-blue-500/50 hover:border-blue-400/50"
        >
          <Scan className={`w-4 h-4 ${isDetectingConflicts ? 'animate-spin' : ''}`} />
          {isDetectingConflicts ? '检测中...' : '重新检测'}
        </button>
      </div>
    </div>
  );
}
