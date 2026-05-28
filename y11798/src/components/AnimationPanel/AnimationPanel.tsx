import React, { useMemo } from 'react';
import { CalculationInput, CalculationResult } from '../../types';
import { formatNumber } from '../../utils/calculator';
import { Play } from 'lucide-react';

interface AnimationPanelProps {
  input: CalculationInput;
  result: CalculationResult | null;
  isAnimating: boolean;
  onPlay: () => void;
}

export const AnimationPanel: React.FC<AnimationPanelProps> = ({
  input,
  result,
  isAnimating,
  onPlay,
}) => {
  const areaRatio = useMemo(() => {
    if (input.smallPistonArea <= 0) return 10;
    return input.largePistonArea / input.smallPistonArea;
  }, [input.smallPistonArea, input.largePistonArea]);

  const smallPistonRadius = useMemo(() => {
    return Math.max(15, Math.min(35, Math.sqrt(input.smallPistonArea) * 3));
  }, [input.smallPistonArea]);

  const largePistonRadius = useMemo(() => {
    return Math.max(30, Math.min(70, Math.sqrt(input.largePistonArea) * 3));
  }, [input.largePistonArea]);

  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 400;
  const SMALL_CYLINDER_X = 100;
  const LARGE_CYLINDER_X = 350;
  const CYLINDER_TOP = 80;
  const CYLINDER_BOTTOM = 320;
  const LIQUID_LEVEL_BASE = 100;

  const smallStroke = isAnimating ? Math.min(80, input.inputStroke * 2) : 0;
  const largeStroke = isAnimating ? smallStroke / Math.max(areaRatio, 1) : 0;

  const smallPistonY = CYLINDER_TOP + LIQUID_LEVEL_BASE - smallStroke;
  const largePistonY = CYLINDER_TOP + LIQUID_LEVEL_BASE - largeStroke;

  const smallCylinderHeight = CYLINDER_BOTTOM - CYLINDER_TOP;
  const largeCylinderHeight = CYLINDER_BOTTOM - CYLINDER_TOP;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm">
            ▶
          </span>
          动画演示
        </h2>
        <button
          onClick={onPlay}
          disabled={!result || isAnimating}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            result && !isAnimating
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Play size={16} />
          {isAnimating ? '演示中...' : '播放动画'}
        </button>
      </div>

      <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-200">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto"
        >
          <defs>
            <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="cylinderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="50%" stopColor="#d1d5db" />
              <stop offset="100%" stopColor="#9ca3af" />
            </linearGradient>
            <linearGradient id="pistonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <rect
            x="0"
            y={CYLINDER_BOTTOM}
            width={SVG_WIDTH}
            height="40"
            fill="#4b5563"
            rx="4"
          />
          <text x={SVG_WIDTH / 2} y={CYLINDER_BOTTOM + 25} textAnchor="middle" fill="white" fontSize="12">
            液压油底座
          </text>

          <rect
            x={SMALL_CYLINDER_X - smallPistonRadius - 10}
            y={CYLINDER_TOP}
            width={smallPistonRadius * 2 + 20}
            height={smallCylinderHeight}
            fill="url(#cylinderGradient)"
            stroke="#4b5563"
            strokeWidth="2"
            rx="4"
          />

          <rect
            x={LARGE_CYLINDER_X - largePistonRadius - 10}
            y={CYLINDER_TOP}
            width={largePistonRadius * 2 + 20}
            height={largeCylinderHeight}
            fill="url(#cylinderGradient)"
            stroke="#4b5563"
            strokeWidth="2"
            rx="4"
          />

          <path
            d={`
              M ${SMALL_CYLINDER_X} ${CYLINDER_BOTTOM}
              Q ${SMALL_CYLINDER_X + 60} ${CYLINDER_BOTTOM - 30}, ${(SMALL_CYLINDER_X + LARGE_CYLINDER_X) / 2} ${CYLINDER_BOTTOM - 20}
              Q ${LARGE_CYLINDER_X - 60} ${CYLINDER_BOTTOM - 30}, ${LARGE_CYLINDER_X} ${CYLINDER_BOTTOM}
            `}
            fill="none"
            stroke="#374151"
            strokeWidth="20"
            strokeLinecap="round"
          />

          <rect
            x={SMALL_CYLINDER_X - smallPistonRadius}
            y={smallPistonY + 15}
            width={smallPistonRadius * 2}
            height={CYLINDER_BOTTOM - smallPistonY - 15}
            fill="url(#liquidGradient)"
            className="transition-all duration-1000 ease-in-out"
          />

          <rect
            x={LARGE_CYLINDER_X - largePistonRadius}
            y={largePistonY + 15}
            width={largePistonRadius * 2}
            height={CYLINDER_BOTTOM - largePistonY - 15}
            fill="url(#liquidGradient)"
            className="transition-all duration-1000 ease-in-out"
          />

          <rect
            x={SMALL_CYLINDER_X - smallPistonRadius - 5}
            y={smallPistonY}
            width={smallPistonRadius * 2 + 10}
            height="20"
            fill="url(#pistonGradient)"
            stroke="#374151"
            strokeWidth="2"
            rx="3"
            className="transition-all duration-1000 ease-in-out"
          />

          <rect
            x={SMALL_CYLINDER_X - 8}
            y={smallPistonY - 60}
            width="16"
            height="60"
            fill="url(#pistonGradient)"
            stroke="#374151"
            strokeWidth="2"
            className="transition-all duration-1000 ease-in-out"
          />

          <ellipse
            cx={SMALL_CYLINDER_X}
            cy={smallPistonY - 65}
            rx="30"
            ry="10"
            fill="#4b5563"
            stroke="#374151"
            strokeWidth="2"
            className="transition-all duration-1000 ease-in-out"
          />

          <rect
            x={LARGE_CYLINDER_X - largePistonRadius - 5}
            y={largePistonY}
            width={largePistonRadius * 2 + 10}
            height="20"
            fill="url(#pistonGradient)"
            stroke="#374151"
            strokeWidth="2"
            rx="3"
            className="transition-all duration-1000 ease-in-out"
          />

          <rect
            x={LARGE_CYLINDER_X - 15}
            y={largePistonY - 80}
            width="30"
            height="80"
            fill="url(#pistonGradient)"
            stroke="#374151"
            strokeWidth="2"
            className="transition-all duration-1000 ease-in-out"
          />

          <rect
            x={LARGE_CYLINDER_X - 50}
            y={largePistonY - 100}
            width="100"
            height="25"
            fill="#6b7280"
            stroke="#374151"
            strokeWidth="2"
            rx="5"
            className="transition-all duration-1000 ease-in-out"
          />
          <text
            x={LARGE_CYLINDER_X}
            y={largePistonY - 83}
            textAnchor="middle"
            fill="white"
            fontSize="11"
            fontWeight="bold"
            className="transition-all duration-1000 ease-in-out"
          >
            负载平台
          </text>

          <g filter="url(#glow)" className="transition-all duration-1000 ease-in-out">
            <path
              d={`M ${SMALL_CYLINDER_X - 50} ${smallPistonY - 40} L ${SMALL_CYLINDER_X - 10} ${smallPistonY - 40} L ${SMALL_CYLINDER_X - 10} ${smallPistonY - 50} L ${SMALL_CYLINDER_X + 10} ${smallPistonY - 30} L ${SMALL_CYLINDER_X - 10} ${smallPistonY - 10} L ${SMALL_CYLINDER_X - 10} ${smallPistonY - 20} L ${SMALL_CYLINDER_X - 50} ${smallPistonY - 20} Z`}
              fill="#ef4444"
            />
            <text
              x={SMALL_CYLINDER_X - 55}
              y={smallPistonY - 25}
              textAnchor="end"
              fill="#dc2626"
              fontSize="12"
              fontWeight="bold"
            >
              F₁ = {formatNumber(input.inputForce)}{input.inputForceUnit}
            </text>
          </g>

          {result && (
            <g filter="url(#glow)" className="transition-all duration-1000 ease-in-out">
              <path
                d={`M ${LARGE_CYLINDER_X + 50} ${largePistonY - 60} L ${LARGE_CYLINDER_X + 10} ${largePistonY - 60} L ${LARGE_CYLINDER_X + 10} ${largePistonY - 80} L ${LARGE_CYLINDER_X - 10} ${largePistonY - 40} L ${LARGE_CYLINDER_X + 10} ${largePistonY} L ${LARGE_CYLINDER_X + 10} ${largePistonY - 20} L ${LARGE_CYLINDER_X + 50} ${largePistonY - 20} Z`}
                fill="#22c55e"
                transform={`scale(${Math.min(2, 1 + areaRatio * 0.05)}, ${Math.min(2, 1 + areaRatio * 0.05)}) translate(${LARGE_CYLINDER_X * (1 - Math.min(2, 1 + areaRatio * 0.05))}, ${largePistonY * (1 - Math.min(2, 1 + areaRatio * 0.05)) - 40})`}
              />
              <text
                x={LARGE_CYLINDER_X + 55}
                y={largePistonY - 45}
                textAnchor="start"
                fill="#16a34a"
                fontSize="12"
                fontWeight="bold"
              >
                F₂ = {formatNumber(result.outputForce)}{result.outputForceUnit}
              </text>
            </g>
          )}

          <text x={SMALL_CYLINDER_X} y={CYLINDER_TOP - 10} textAnchor="middle" fill="#374151" fontSize="13" fontWeight="bold">
            小活塞 (A₁)
          </text>
          <text x={LARGE_CYLINDER_X} y={CYLINDER_TOP - 10} textAnchor="middle" fill="#374151" fontSize="13" fontWeight="bold">
            大活塞 (A₂)
          </text>

          <g>
            <line
              x1={SMALL_CYLINDER_X + smallPistonRadius + 20}
              y1={smallPistonY + 10}
              x2={SMALL_CYLINDER_X + smallPistonRadius + 20}
              y2={CYLINDER_BOTTOM - 10}
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4"
              className="transition-all duration-1000 ease-in-out"
            />
            <text
              x={SMALL_CYLINDER_X + smallPistonRadius + 25}
              y={(smallPistonY + CYLINDER_BOTTOM) / 2}
              fill="#d97706"
              fontSize="10"
              className="transition-all duration-1000 ease-in-out"
            >
              S₁
            </text>
          </g>

          {result && (
            <g>
              <line
                x1={LARGE_CYLINDER_X - largePistonRadius - 20}
                y1={largePistonY + 10}
                x2={LARGE_CYLINDER_X - largePistonRadius - 20}
                y2={CYLINDER_BOTTOM - 10}
                stroke="#0d9488"
                strokeWidth="2"
                strokeDasharray="4"
                className="transition-all duration-1000 ease-in-out"
              />
              <text
                x={LARGE_CYLINDER_X - largePistonRadius - 25}
                y={(largePistonY + CYLINDER_BOTTOM) / 2}
                textAnchor="end"
                fill="#0f766e"
                fontSize="10"
                className="transition-all duration-1000 ease-in-out"
              >
                S₂
              </text>
            </g>
          )}

          <text
            x={SMALL_CYLINDER_X}
            y={CYLINDER_BOTTOM + 60}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="11"
          >
            A₁ = {formatNumber(input.smallPistonArea)}{input.smallPistonAreaUnit}
          </text>
          <text
            x={LARGE_CYLINDER_X}
            y={CYLINDER_BOTTOM + 60}
            textAnchor="middle"
            fill="#6b7280"
            fontSize="11"
          >
            A₂ = {formatNumber(input.largePistonArea)}{input.largePistonAreaUnit}
          </text>
        </svg>

        {result && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-md border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">面积比</div>
            <div className="text-lg font-bold text-blue-600">
              {formatNumber(areaRatio, 2)}:1
            </div>
          </div>
        )}
      </div>

      {!result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
          请输入有效参数后查看动画演示
        </div>
      )}

      {result && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <div className="text-xs text-gray-500">输入力</div>
            <div className="text-lg font-bold text-red-600">
              {formatNumber(input.inputForce)}{input.inputForceUnit}
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <div className="text-xs text-gray-500">放大倍数</div>
            <div className="text-lg font-bold text-blue-600">
              {formatNumber(result.amplificationRatio, 1)}×
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <div className="text-xs text-gray-500">输出力</div>
            <div className="text-lg font-bold text-green-600">
              {formatNumber(result.outputForce)}{result.outputForceUnit}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
