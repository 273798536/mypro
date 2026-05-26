import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import Berth from './Berth';
import Ship from './Ship';
import Tug from './Tug';

const PortMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { tugs, ships, berths, selectedTugId, selectTug, moveTug, isDragging, setDragging } =
    useGameStore();

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !selectedTugId) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!isDragging) {
      moveTug(selectedTugId, { x, y });
    }
    selectTug(undefined);
    setDragging(false);
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-slate-700">
      <svg
        ref={svgRef}
        viewBox="0 0 700 450"
        className="w-full h-full"
        onClick={handleMapClick}
      >
        <defs>
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="700" height="450" fill="url(#oceanGradient)" />

        {[...Array(15)].map((_, i) => (
          <circle
            key={i}
            cx={50 + Math.random() * 600}
            cy={50 + Math.random() * 350}
            r={2 + Math.random() * 3}
            fill="rgba(255,255,255,0.1)"
          />
        ))}

        <path
          d="M 50 0 L 200 0 L 200 100 L 350 100 L 350 450 L 700 450 L 700 0 L 50 0 Z"
          fill="url(#landGradient)"
          opacity="0.9"
        />

        <line x1="200" y1="50" x2="200" y2="100" stroke="#475569" strokeWidth="3" />
        <line x1="350" y1="50" x2="350" y2="100" stroke="#475569" strokeWidth="3" />

        <line x1="350" y1="150" x2="350" y2="450" stroke="#475569" strokeWidth="4" />
        <line x1="500" y1="50" x2="500" y2="450" stroke="#475569" strokeWidth="4" />
        <line x1="620" y1="50" x2="620" y2="450" stroke="#475569" strokeWidth="4" />

        {berths.map((berth) => (
          <Berth key={berth.id} berth={berth} />
        ))}

        {ships.map((ship) => (
          <Ship key={ship.id} ship={ship} />
        ))}

        {tugs.map((tug) => (
          <Tug
            key={tug.id}
            tug={tug}
            isSelected={selectedTugId === tug.id}
            onSelect={() => selectTug(tug.id)}
          />
        ))}

        {selectedTugId && (
          <text
            x="350"
            y="430"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="12"
            fontWeight="500"
          >
            点击地图移动选中的拖轮，或点击船舶分配任务
          </text>
        )}
      </svg>

      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg border border-slate-700">
        <div className="text-xs text-slate-400 mb-1">图例</div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-slate-300">拖轮</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-slate-300">船舶</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-slate-300">泊位</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortMap;
