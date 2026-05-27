import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { calculateConnectivity } from '../../game/connectivity';
import { getPressureColor } from '../../game/pressure';
import { PipeNode } from '../../game/types';

const PipeNetwork: React.FC = () => {
  const { gameState, handleValveClick, viewMode } = useGameStore();
  const { nodes, connections, valves, leaks, userZones } = gameState;

  const connectivity = useMemo(() => {
    return calculateConnectivity(nodes, connections, valves);
  }, [nodes, connections, valves]);

  const getNodePosition = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const renderPipe = (conn: { id: string; from: string; to: string; diameter: number }) => {
    const from = getNodePosition(conn.from);
    const to = getNodePosition(conn.to);

    const fromNode = nodes.find((n) => n.id === conn.from);
    const toNode = nodes.find((n) => n.id === conn.to);
    const fromValve = fromNode?.type === 'valve' ? valves.get(conn.from) : null;
    const toValve = toNode?.type === 'valve' ? valves.get(conn.to) : null;

    const isActive =
      (fromNode?.type !== 'valve' || fromValve?.isOpen) &&
      (toNode?.type !== 'valve' || toValve?.isOpen) &&
      connectivity.connectedNodes.has(conn.from) &&
      connectivity.connectedNodes.has(conn.to);

    const strokeWidth = Math.max(3, conn.diameter / 100);
    const color = isActive ? '#2563EB' : '#374151';

    return (
      <line
        key={conn.id}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={isActive ? 'drop-shadow-lg' : ''}
      />
    );
  };

  const renderNode = (node: PipeNode) => {
    const isConnected = connectivity.connectedNodes.has(node.id);
    const pressure = node.pressure ?? 0;
    const pressureColor = getPressureColor(pressure);

    switch (node.type) {
      case 'source':
        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle r="20" fill="#1E3A5F" stroke="#2563EB" strokeWidth="3" />
            <text y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">水</text>
            <text y="35" textAnchor="middle" fill="#94A3B8" fontSize="10">{node.name}</text>
          </g>
        );

      case 'junction':
        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle r="8" fill={isConnected ? '#2563EB' : '#374151'} />
            <text y="22" textAnchor="middle" fill="#64748B" fontSize="10">{node.name}</text>
          </g>
        );

      case 'valve': {
        const valveState = valves.get(node.id);
        const isOpen = valveState?.isOpen ?? true;
        const isMainValve = node.isMainValve;

        return (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            className={`cursor-pointer transition-transform duration-200 ${viewMode === 'game' ? 'hover:scale-110' : ''}`}
            onClick={() => handleValveClick(node.id)}
          >
            <circle
              r="18"
              fill={isOpen ? '#064E3B' : '#7F1D1D'}
              stroke={isMainValve ? '#FBBF24' : (isOpen ? '#10B981' : '#EF4444')}
              strokeWidth={isMainValve ? 3 : 2}
              className={`${!isOpen ? 'animate-pulse' : ''}`}
            />
            <line
              x1={isOpen ? -8 : 0}
              y1={isOpen ? -8 : 0}
              x2={isOpen ? 8 : 0}
              y2={isOpen ? 8 : 0}
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {!isOpen && (
              <line
                x1="0"
                y1="-8"
                x2="0"
                y2="8"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
            <text y="32" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontWeight="medium">
              {node.name}
            </text>
            {isMainValve && (
              <text y="-25" textAnchor="middle" fill="#FBBF24" fontSize="9" fontWeight="bold">
                主阀
              </text>
            )}
            {pressure > 0 && (
              <circle
                cx="25"
                cy="-15"
                r="5"
                fill={pressureColor}
                className="animate-pulse"
              />
            )}
          </g>
        );
      }

      case 'leak': {
        const leakState = leaks.get(node.id);
        const isControlled = leakState?.isControlled ?? false;

        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle
              r="15"
              fill={isControlled ? '#1E3A5F' : '#7F1D1D'}
              stroke={isControlled ? '#64748B' : '#EF4444'}
              strokeWidth="2"
              className={!isControlled ? 'animate-leak' : ''}
            />
            {isControlled ? (
              <path
                d="M -6 0 L -2 4 L 6 -6"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <text y="4" textAnchor="middle" fill="white" fontSize="10">💧</text>
            )}
            <text y="32" textAnchor="middle" fill={isControlled ? '#64748B' : '#EF4444'} fontSize="10">
              {node.name}
            </text>
            {!isControlled && (
              <text y="45" textAnchor="middle" fill="#F87171" fontSize="9">
                漏水中
              </text>
            )}
          </g>
        );
      }

      case 'user': {
        const zone = userZones.find((z) => z.nodeIds.includes(node.id));
        const hasWater = zone?.hasWater ?? isConnected;

        return (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <rect
              x="-25"
              y="-20"
              width="50"
              height="40"
              rx="4"
              fill={hasWater ? '#064E3B' : '#450A0A'}
              stroke={hasWater ? '#10B981' : '#EF4444'}
              strokeWidth="2"
            />
            <text y="5" textAnchor="middle" fill="white" fontSize="11">
              {node.name}
            </text>
            {zone && (
              <text y="20" textAnchor="middle" fill={hasWater ? '#6EE7B7' : '#FCA5A5'} fontSize="9">
                {zone.population}户
              </text>
            )}
            <circle
              cx="20"
              cy="-15"
              r="5"
              fill={hasWater ? '#10B981' : '#EF4444'}
              className="animate-pulse"
            />
          </g>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full industrial-panel p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-industrial-text">管网拓扑图</h2>
        <div className="flex items-center gap-4 text-xs text-industrial-muted">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-industrial-green" />
            <span>正常供水</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-industrial-red" />
            <span>停水/低压</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-industrial-orange" />
            <span>漏点</span>
          </div>
        </div>
      </div>
      <div className="relative w-full h-[calc(100%-40px)] bg-industrial-bg/50 rounded-lg overflow-hidden">
        <svg
          viewBox="0 0 1000 600"
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        >
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1E3A5F" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {connections.map(renderPipe)}
          {nodes.map(renderNode)}
        </svg>
      </div>
    </div>
  );
};

export default PipeNetwork;
