import { useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { getDifficultyColor } from '@/data/slopes';
import { MapPin, User, AlertTriangle } from 'lucide-react';

export const SlopeMap = () => {
  const { slopeMap, victims, patrollers, selectedVictim, selectVictim } = useGameStore();

  const nodeMap = useMemo(() => {
    return new Map(slopeMap.map(node => [node.id, node]));
  }, [slopeMap]);

  const renderConnections = () => {
    const lines: JSX.Element[] = [];
    const drawnConnections = new Set<string>();

    slopeMap.forEach(node => {
      node.connectedTo.forEach(connectedId => {
        const key = [node.id, connectedId].sort().join('-');
        if (drawnConnections.has(key)) return;
        drawnConnections.add(key);

        const connectedNode = nodeMap.get(connectedId);
        if (!connectedNode) return;

        const isOpen = node.isOpen && connectedNode.isOpen;
        const color = isOpen ? getDifficultyColor(node.difficulty) : '#9E9E9E';

        lines.push(
          <line
            key={key}
            x1={node.x}
            y1={node.y}
            x2={connectedNode.x}
            y2={connectedNode.y}
            stroke={color}
            strokeWidth={isOpen ? 4 : 2}
            strokeDasharray={isOpen ? 'none' : '8,4'}
            opacity={isOpen ? 0.8 : 0.4}
          />
        );
      });
    });

    return lines;
  };

  const renderNodes = () => {
    return slopeMap.map(node => (
      <g key={node.id}>
        <circle
          cx={node.x}
          cy={node.y}
          r={node.id === 'base' ? 18 : 12}
          fill={node.isOpen ? getDifficultyColor(node.difficulty) : '#BDBDBD'}
          stroke="white"
          strokeWidth={3}
          className="transition-all duration-300"
        />
        <text
          x={node.x}
          y={node.y + 4}
          textAnchor="middle"
          fill="white"
          fontSize={node.id === 'base' ? 12 : 10}
          fontWeight="bold"
        >
          {node.id === 'base' ? '基地' : ''}
        </text>
        <text
          x={node.x}
          y={node.y + 28}
          textAnchor="middle"
          fill="#37474F"
          fontSize={10}
        >
          {node.name}
        </text>
      </g>
    ));
  };

  const renderVictims = () => {
    return victims.filter(v => !v.isRescued && !v.isFailed).map(victim => {
      const node = nodeMap.get(victim.location);
      if (!node) return null;

      const isSelected = selectedVictim === victim.id;
      const isUrgent = victim.timeRemaining < victim.initialTime * 0.3;

      return (
        <g
          key={victim.id}
          onClick={() => selectVictim(isSelected ? null : victim.id)}
          className="cursor-pointer"
        >
          <circle
            cx={node.x}
            cy={node.y - 25}
            r={16}
            fill={isUrgent ? '#E53935' : '#FF9800'}
            stroke="white"
            strokeWidth={2}
            className={isSelected ? 'animate-pulse' : ''}
          />
          <User
            x={node.x - 10}
            y={node.y - 35}
            width={20}
            height={20}
            fill="white"
            stroke="white"
          />
          {isUrgent && (
            <AlertTriangle
              x={node.x + 5}
              y={node.y - 45}
              width={16}
              height={16}
              className="animate-pulse text-yellow-400"
            />
          )}
        </g>
      );
    });
  };

  const renderPatrollers = () => {
    return patrollers.map(patroller => {
      if (patroller.status === 'idle') {
        const base = nodeMap.get('base');
        if (!base) return null;
        const index = patrollers.filter(p => p.status === 'idle').indexOf(patroller);
        return (
          <g key={patroller.id}>
            <circle
              cx={base.x - 30 + index * 25}
              cy={base.y + 35}
              r={12}
              fill="#1E88E5"
              stroke="white"
              strokeWidth={2}
            />
            <text
              x={base.x - 30 + index * 25}
              y={base.y + 39}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight="bold"
            >
              {patroller.name[0]}
            </text>
          </g>
        );
      }

      if (patroller.status === 'en-route' && patroller.assignedVictim) {
        const victim = victims.find(v => v.id === patroller.assignedVictim);
        if (!victim) return null;
        const targetNode = nodeMap.get(victim.location);
        const baseNode = nodeMap.get('base');
        if (!targetNode || !baseNode) return null;

        const progress = patroller.progress / 100;
        const x = baseNode.x + (targetNode.x - baseNode.x) * progress;
        const y = baseNode.y + (targetNode.y - baseNode.y) * progress;

        return (
          <g key={patroller.id}>
            <circle
              cx={x}
              cy={y}
              r={14}
              fill="#1E88E5"
              stroke="white"
              strokeWidth={2}
              className="animate-pulse"
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight="bold"
            >
              {patroller.name[0]}
            </text>
          </g>
        );
      }

      return null;
    });
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-sky-100 to-sky-50 rounded-xl overflow-hidden">
      <svg viewBox="0 0 800 500" className="w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {renderConnections()}
        {renderNodes()}
        {renderVictims()}
        {renderPatrollers()}
      </svg>

      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm font-semibold text-gray-700 mb-2">图例</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slope-green"></div>
            <span>初级道</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slope-blue"></div>
            <span>中级道</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slope-black"></div>
            <span>高级道</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slope-double-black"></div>
            <span>专家道</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm font-semibold text-gray-700 mb-2">图例</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-orange-500" />
            <span>伤员位置</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-snow-blue-500"></div>
            <span>巡逻员</span>
          </div>
        </div>
      </div>
    </div>
  );
};
