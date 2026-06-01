
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, SkipBack, AlertTriangle, MapPin, Clock, Zap, RotateCcw, Gauge } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useSceneStore } from '../../store/useSceneStore';
import { useFilterStore } from '../../store/useFilterStore';
import type { Problem } from '../../types';

export function RightPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const problems = useDataStore(state => state.problems);
  const trajectories = useDataStore(state => state.trajectories);
  const beacons = useDataStore(state => state.beacons);
  const isPlaying = useSceneStore(state => state.isPlaying);
  const setIsPlaying = useSceneStore(state => state.setIsPlaying);
  const playbackTime = useSceneStore(state => state.playbackTime);
  const setPlaybackTime = useSceneStore(state => state.setPlaybackTime);
  const playbackSpeed = useSceneStore(state => state.playbackSpeed);
  const setPlaybackSpeed = useSceneStore(state => state.setPlaybackSpeed);
  const selectedObject = useSceneStore(state => state.selectedObject);
  const setSelectedObject = useSceneStore(state => state.setSelectedObject);
  const setFocusPosition = useSceneStore(state => state.setFocusPosition);
  const showProblems = useFilterStore(state => state.showProblems);
  
  const highCount = problems.filter(p => p.severity === 'high').length;
  const mediumCount = problems.filter(p => p.severity === 'medium').length;
  const lowCount = problems.filter(p => p.severity === 'low').length;
  
  const handleFocusProblem = (problem: Problem) => {
    setSelectedObject({ type: 'problem', id: problem.id });
    setFocusPosition({
      x: problem.position.x,
      y: problem.position.z,
      z: problem.position.y
    });
  };
  
  if (collapsed) {
    return (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20">
        <button
          onClick={() => setCollapsed(false)}
          className="bg-slate-800/90 backdrop-blur-sm p-2 rounded-l-lg border border-slate-700 border-r-0 hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-cyan-400" />
        </button>
      </div>
    );
  }
  
  return (
    <div className="absolute right-4 top-20 bottom-4 w-80 z-10 flex flex-col gap-4">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">轨迹回放</h3>
              <p className="text-gray-500 text-xs">{trajectories.length} 个定位点</p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max="100"
            value={playbackTime * 100}
            onChange={(e) => setPlaybackTime(Number(e.target.value) / 100)}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-gray-500 text-xs">开始</span>
            <span className="text-green-400 text-xs font-mono">{Math.round(playbackTime * 100)}%</span>
            <span className="text-gray-500 text-xs">结束</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaybackTime(0)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <SkipBack className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
              isPlaying
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? '暂停' : '播放'}
            </div>
          </button>
          <button
            onClick={() => setPlaybackSpeed(playbackSpeed === 2 ? 0.5 : playbackSpeed === 0.5 ? 1 : 2)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Gauge className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-xs text-gray-400 w-8">{playbackSpeed}x</span>
        </div>
      </div>
      
      {showProblems && (
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 flex-1 flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">问题检测</h3>
                  <p className="text-gray-500 text-xs">{problems.length} 个问题</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-red-500/10 rounded-lg p-2 text-center border border-red-500/30">
                <div className="text-red-400 font-bold text-lg">{highCount}</div>
                <div className="text-red-400/60 text-[10px]">严重</div>
              </div>
              <div className="flex-1 bg-yellow-500/10 rounded-lg p-2 text-center border border-yellow-500/30">
                <div className="text-yellow-400 font-bold text-lg">{mediumCount}</div>
                <div className="text-yellow-400/60 text-[10px]">中等</div>
              </div>
              <div className="flex-1 bg-green-500/10 rounded-lg p-2 text-center border border-green-500/30">
                <div className="text-green-400 font-bold text-lg">{lowCount}</div>
                <div className="text-green-400/60 text-[10px]">轻微</div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {problems.map(problem => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                isSelected={selectedObject?.type === 'problem' && selectedObject?.id === problem.id}
                onFocus={() => handleFocusProblem(problem)}
              />
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          数据统计
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={<MapPin />} label="信标数" value={beacons.length} color="cyan" />
          <StatCard icon={<Clock />} label="轨迹点" value={trajectories.length} color="green" />
          <StatCard icon={<Zap />} label="问题数" value={problems.length} color="red" />
        </div>
      </div>
    </div>
  );
}

function ProblemCard({ problem, isSelected, onFocus }: {
  problem: Problem;
  isSelected: boolean;
  onFocus: () => void;
}) {
  const getIcon = () => {
    switch (problem.type) {
      case 'floor_jump': return <RotateCcw className="w-4 h-4" />;
      case 'duplicate_beacon': return <AlertTriangle className="w-4 h-4" />;
      case 'trajectory_drift': return <Zap className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };
  
  const getSeverityColor = () => {
    switch (problem.severity) {
      case 'high': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' };
      case 'medium': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' };
      case 'low': return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' };
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' };
    }
  };
  
  const colors = getSeverityColor();
  
  return (
    <button
      onClick={onFocus}
      className={`w-full text-left p-3 rounded-xl transition-all ${
        isSelected
          ? `${colors.bg} border ${colors.border}`
          : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-bold text-sm ${colors.text}`}>{problem.title}</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {problem.severity === 'high' ? '严重' : problem.severity === 'medium' ? '中等' : '轻微'}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{problem.humanReadable.slice(0, 50)}...</p>
          <p className="text-gray-500 text-[10px] mt-1">点击聚焦到3D视图</p>
        </div>
      </div>
    </button>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400'
  };
  
  return (
    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
      <div className={`${colorClasses[color]} mb-1 flex justify-center`}>
        {icon}
      </div>
      <div className={`text-lg font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-gray-500 text-[10px]">{label}</div>
    </div>
  );
}

