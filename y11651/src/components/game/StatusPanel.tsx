import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Map, Radio, AlertTriangle, Navigation } from 'lucide-react';
import type { ScanRecord, Submarine } from '../../types/game';
import { getDirectionArrow, getDirectionName } from '../../utils/submarineAI';

interface StatusPanelProps {
  scanHistory: ScanRecord[];
  submarine: Submarine;
  markedCells: number;
  scannedCells: number;
  totalCells: number;
  showSubmarineInfo?: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  scanHistory,
  submarine,
  markedCells,
  scannedCells,
  totalCells,
  showSubmarineInfo = false
}) => {
  const latestScan = scanHistory[scanHistory.length - 1];
  const strongScans = scanHistory.filter(s => s.echoStrength >= 60).length;
  const noiseScans = scanHistory.filter(s => s.hasNoise).length;

  return (
    <motion.div
      className="bg-slate-800/90 rounded-xl p-4 border border-slate-700 space-y-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
        <Activity className="w-5 h-5" />
        状态面板
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">已扫描</p>
          <p className="text-xl font-bold text-cyan-400">
            {scannedCells} / {totalCells}
          </p>
          <p className="text-xs text-slate-500">
            {((scannedCells / totalCells) * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">已标记</p>
          <p className="text-xl font-bold text-yellow-400">
            {markedCells}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">强回波</p>
          <p className="text-xl font-bold text-green-400">
            {strongScans}
          </p>
        </div>
        
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-400 mb-1">噪声干扰</p>
          <p className="text-xl font-bold text-red-400">
            {noiseScans}
          </p>
        </div>
      </div>

      {showSubmarineInfo && (
        <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            目标信息
          </p>
          <div className="text-xs space-y-1">
            <p>
              <span className="text-slate-400">当前位置:</span>
              <span className="text-white ml-2">
                ({submarine.position.x}, {submarine.position.y})
              </span>
            </p>
            <p>
              <span className="text-slate-400">方向:</span>
              <span className="text-white ml-2">
                {getDirectionArrow(submarine.direction)} {getDirectionName(submarine.direction)}
              </span>
            </p>
            <p>
              <span className="text-slate-400">速度:</span>
              <span className="text-white ml-2">{submarine.speed} 格/回合</span>
            </p>
            <p>
              <span className="text-slate-400">轨迹长度:</span>
              <span className="text-white ml-2">{submarine.trajectory.length}</span>
            </p>
            {submarine.isTurning && (
              <p className="text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                目标正在转向！
              </p>
            )}
          </div>
        </div>
      )}

      {latestScan && (
        <div className="bg-slate-700/50 rounded-lg p-3">
          <p className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4" />
            最近扫描
          </p>
          <div className="text-xs space-y-1">
            <p>
              <span className="text-slate-400">位置:</span>
              <span className="text-white ml-2">
                ({latestScan.position.x}, {latestScan.position.y})
              </span>
            </p>
            <p>
              <span className="text-slate-400">回波强度:</span>
              <span className={`ml-2 ${latestScan.echoStrength >= 60 ? 'text-green-400' : latestScan.echoStrength >= 30 ? 'text-yellow-400' : 'text-slate-400'}`}>
                {latestScan.echoStrength}%
              </span>
            </p>
            {latestScan.hasNoise && (
              <p className="text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                噪声强度: {latestScan.noiseLevel}%
              </p>
            )}
            {latestScan.detectedTarget && (
              <p className="text-green-400">✓ 检测到目标信号</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-slate-700/50 rounded-lg p-3">
        <p className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
          <Map className="w-4 h-4" />
          扫描历史
        </p>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {scanHistory.length === 0 ? (
            <p className="text-xs text-slate-500 italic">暂无扫描记录</p>
          ) : (
            [...scanHistory].reverse().slice(0, 8).map((scan, index) => (
              <div
                key={index}
                className="text-xs flex justify-between items-center py-1 border-b border-slate-600/50 last:border-0"
              >
                <span className="text-slate-400">
                  回合 {scan.turn}: ({scan.position.x}, {scan.position.y})
                </span>
                <span className={`font-mono ${
                  scan.echoStrength >= 60 ? 'text-green-400' :
                  scan.echoStrength >= 30 ? 'text-yellow-400' :
                  'text-slate-500'
                }`}>
                  {scan.echoStrength}%
                  {scan.hasNoise && <span className="text-red-400 ml-1">⚠</span>}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
