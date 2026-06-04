import React, { useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGameFlow } from '@/hooks/useGameFlow';
import { CAMPUS_MAP_CONFIG } from '@/data/mockMap';
import { Point, AnomalyType } from '@/types';

interface MapCanvasProps {
  onMark: (point: Point) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ onMark }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [showMarkMenu, setShowMarkMenu] = useState(false);
  const [markPosition, setMarkPosition] = useState<Point | null>(null);
  const [anomalyType, setAnomalyType] = useState<AnomalyType>('color_out_of_bounds');
  const [description, setDescription] = useState('');
  const [opinion, setOpinion] = useState('');
  const [markType, setMarkType] = useState<'hit' | 'anomaly'>('hit');
  
  const { routePoints, actionLogs, selectedMaterialId, markHit, markAnomaly, gameStatus, isReplaying, replayIndex } = useAppStore();
  const gameFlow = useGameFlow();

  const displayLogs = isReplaying ? actionLogs.slice(0, replayIndex + 1) : actionLogs;
  const displayRoutePoints = isReplaying 
    ? routePoints.slice(0, replayIndex + PRESET_ROUTE.length)
    : routePoints;

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gameStatus !== 'playing' || isReplaying) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    const point: Point = { x, y, timestamp: Date.now() };
    setMarkPosition(point);
    
    if (selectedMaterialId) {
      setShowMarkMenu(true);
      setDescription(`在坐标 (${x}, ${y}) 标记`);
    } else {
      onMark(point);
    }
  }, [gameStatus, isReplaying, selectedMaterialId, onMark]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setHoverPoint({ x, y, timestamp: 0 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null);
  }, []);

  const handleConfirmMark = () => {
    if (!markPosition || !selectedMaterialId) return;

    if (markType === 'hit') {
      markHit({
        materialId: selectedMaterialId,
        point: markPosition,
        description,
      });
    } else {
      markAnomaly({
        materialId: selectedMaterialId,
        point: markPosition,
        anomalyType,
        description,
        opinion: opinion || '建议尽快整改',
      });
    }

    setShowMarkMenu(false);
    setMarkPosition(null);
    setDescription('');
    setOpinion('');
  };

  const handleCancelMark = () => {
    setShowMarkMenu(false);
    setMarkPosition(null);
  };

  const { buildings, exits, width, height } = CAMPUS_MAP_CONFIG;

  return (
    <div className="relative flex-1 overflow-hidden bg-neutral-100">
      <div
        ref={canvasRef}
        className="relative mx-auto my-4 map-canvas rounded-xl shadow-medium cursor-crosshair"
        style={{ width, height }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {buildings.map(building => (
          <div
            key={building.id}
            className="absolute rounded-md flex items-center justify-center text-white text-xs font-medium shadow-sm transition-all hover:shadow-md"
            style={{
              left: building.x,
              top: building.y,
              width: building.width,
              height: building.height,
              backgroundColor: building.color,
            }}
          >
            {building.name}
          </div>
        ))}

        {exits.map(exit => (
          <div
            key={exit.id}
            className="absolute bg-success flex items-center justify-center text-white text-xs font-bold rounded shadow-md"
            style={{
              left: exit.x,
              top: exit.y,
              width: exit.width,
              height: exit.height,
            }}
          >
            🚪 {exit.name}
          </div>
        ))}

        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width, height }}>
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B35" />
              <stop offset="100%" stopColor="#FF8C5A" />
            </linearGradient>
          </defs>
          
          {displayRoutePoints.length > 1 && (
            <polyline
              points={displayRoutePoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="route-line"
              opacity="0.8"
            />
          )}

          {displayRoutePoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#FF6B35"
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </svg>

        {displayLogs.filter(l => l.point).map((log, index) => (
          <div
            key={log.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isReplaying ? 'animate-fade-in-up' : ''}`}
            style={{
              left: log.point!.x,
              top: log.point!.y,
              animationDelay: isReplaying ? `${index * 100}ms` : '0ms',
            }}
          >
            <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md marker-pulse ${
              log.type === 'mark_hit' ? 'bg-success' : 'bg-danger'
            }`}>
              <span className="relative z-10">{index + 1}</span>
              {log.type === 'mark_anomaly' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center text-[10px]">
                  !
                </div>
              )}
            </div>
          </div>
        ))}

        {hoverPoint && gameStatus === 'playing' && !isReplaying && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: hoverPoint.x, top: hoverPoint.y }}
          >
            <div className="w-6 h-6 border-2 border-accent rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-accent rounded-full" />
            </div>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              ({hoverPoint.x}, {hoverPoint.y})
            </div>
          </div>
        )}

        {showMarkMenu && markPosition && (
          <div
            className="absolute z-20 bg-white rounded-xl shadow-hard p-4 w-72 animate-slide-in-right"
            style={{
              left: Math.min(markPosition.x + 20, width - 300),
              top: Math.min(markPosition.y - 60, height - 300),
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📍</span>
              <span className="font-semibold text-neutral-700">标记审核</span>
            </div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMarkType('hit')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  markType === 'hit' 
                    ? 'bg-success text-white' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                ✅ 命中
              </button>
              <button
                onClick={() => setMarkType('anomaly')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  markType === 'anomaly' 
                    ? 'bg-danger text-white' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                ⚠️ 异常
              </button>
            </div>

            {markType === 'anomaly' && (
              <>
                <div className="mb-3">
                  <label className="block text-xs text-neutral-500 mb-1">异常类型</label>
                  <select
                    value={anomalyType}
                    onChange={e => setAnomalyType(e.target.value as AnomalyType)}
                    className="input text-sm py-1.5"
                  >
                    <option value="color_out_of_bounds">🎨 颜色越界</option>
                    <option value="route_deviation">↪️ 路线偏差</option>
                    <option value="missing_marker">❌ 标识缺失</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-neutral-500 mb-1">处理意见</label>
                  <input
                    type="text"
                    value={opinion}
                    onChange={e => setOpinion(e.target.value)}
                    placeholder="输入处理意见..."
                    className="input text-sm py-1.5"
                  />
                </div>
              </>
            )}

            <div className="mb-3">
              <label className="block text-xs text-neutral-500 mb-1">说明</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="输入标记说明..."
                className="input text-sm py-1.5"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={handleCancelMark} className="flex-1 btn btn-ghost">
                取消
              </button>
              <button onClick={handleConfirmMark} className="flex-1 btn btn-primary">
                确认标记
              </button>
            </div>
          </div>
        )}

        {gameStatus === 'idle' && !isReplaying && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-bold mb-2">准备开始</h2>
              <p className="text-white/80">请先导入截图素材，然后点击「开始审核」</p>
            </div>
          </div>
        )}

        {gameStatus === 'paused' && !isReplaying && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold mb-2">已暂停</h2>
              <p className="text-white/80">点击「继续」恢复审核</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PRESET_ROUTE = [
  { x: 160, y: 130, timestamp: 0 },
  { x: 200, y: 200, timestamp: 0 },
  { x: 240, y: 280, timestamp: 0 },
  { x: 350, y: 320, timestamp: 0 },
  { x: 420, y: 230, timestamp: 0 },
  { x: 400, y: 120, timestamp: 0 },
  { x: 400, y: 50, timestamp: 0 },
];
