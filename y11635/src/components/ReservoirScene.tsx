import React from 'react';
import { Waves } from 'lucide-react';
import {
  SAFE_LEVEL,
  WARNING_LINE,
  OVERFLOW_LINE,
  RESERVOIR_CAPACITY,
  GATE_FLOW_RATE,
} from '../data/constants';

interface ReservoirSceneProps {
  reservoirLevel: number;
  gateOpening: number;
  upstreamInflow: number;
  weatherType: string;
  warningIssued: boolean;
}

export function ReservoirScene({
  reservoirLevel,
  gateOpening,
  upstreamInflow,
  weatherType,
  warningIssued,
}: ReservoirSceneProps) {
  const levelPercent = (reservoirLevel / RESERVOIR_CAPACITY) * 100;
  const waterHeight = Math.min(levelPercent, 100);
  
  const getWaterColor = () => {
    if (reservoirLevel >= OVERFLOW_LINE) return '#f56565';
    if (reservoirLevel >= WARNING_LINE) return '#ed8936';
    if (reservoirLevel >= SAFE_LEVEL) return '#ecc94b';
    return '#4299e1';
  };

  const getRiskStatus = () => {
    if (reservoirLevel >= OVERFLOW_LINE) return { text: '溢洪风险', color: '#f56565' };
    if (reservoirLevel >= WARNING_LINE) return { text: '预警状态', color: '#ed8936' };
    if (reservoirLevel >= SAFE_LEVEL) return { text: '接近警戒', color: '#ecc94b' };
    return { text: '安全运行', color: '#48bb78' };
  };

  const riskStatus = getRiskStatus();

  return (
    <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl overflow-hidden">
      <svg viewBox="0 0 400 280" className="w-full">
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f2544" />
          </linearGradient>
          <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#63b3ed" />
            <stop offset="100%" stopColor={getWaterColor()} />
          </linearGradient>
          <linearGradient id="damGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#718096" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>
          <clipPath id="reservoirClip">
            <rect x="40" y="30" width="200" height="180" rx="4" />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="400" height="280" fill="url(#skyGradient)" />

        <text x="200" y="25" textAnchor="middle" fill="#a0aec0" fontSize="10" fontWeight="600">
          上游流域
        </text>

        <g>
          <path d="M 20 60 L 40 55 L 40 100 L 20 105 Z" fill="#2d3748" />
          <path d="M 50 50 L 80 42 L 80 80 L 50 88 Z" fill="#4a5568" />
          <path d="M 100 45 L 140 35 L 140 75 L 100 85 Z" fill="#2d3748" />
          <path d="M 160 50 L 200 40 L 200 70 L 160 80 Z" fill="#4a5568" />
        </g>

        <path
          d="M 30 100 Q 80 90, 150 95 L 150 110 Q 80 105, 30 115 Z"
          fill="#2b6cb0"
          opacity="0.5"
        >
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
        </path>

        <rect x="40" y="30" width="200" height="180" rx="4" fill="none" stroke="#4a5568" strokeWidth="2" />
        
        <g clipPath="url(#reservoirClip)">
          <rect
            x="40"
            y={30 + (180 - waterHeight * 1.8)}
            width="200"
            height={waterHeight * 1.8}
            fill="url(#waterGradient)"
          >
            <animate
              attributeName="y"
              values={`${30 + (180 - waterHeight * 1.8)};${30 + (180 - waterHeight * 1.8) + 2};${30 + (180 - waterHeight * 1.8)}`}
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>
          
          {waterHeight > 0 && (
            <ellipse
              cx="140"
              cy={30 + (180 - waterHeight * 1.8)}
              rx="100"
              ry="4"
              fill="#90cdf4"
              opacity="0.5"
            >
              <animate
                attributeName="cy"
                values={`${30 + (180 - waterHeight * 1.8)};${30 + (180 - waterHeight * 1.8) + 3};${30 + (180 - waterHeight * 1.8)}`}
                dur="2s"
                repeatCount="indefinite"
              />
            </ellipse>
          )}
        </g>

        <line
          x1="40"
          y1={30 + 180 - (SAFE_LEVEL / RESERVOIR_CAPACITY) * 180}
          x2="240"
          y2={30 + 180 - (SAFE_LEVEL / RESERVOIR_CAPACITY) * 180}
          stroke="#48bb78"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        <text x="245" y={35 + 180 - (SAFE_LEVEL / RESERVOIR_CAPACITY) * 180} fill="#48bb78" fontSize="8">
          安全线 {SAFE_LEVEL}
        </text>

        <line
          x1="40"
          y1={30 + 180 - (WARNING_LINE / RESERVOIR_CAPACITY) * 180}
          x2="240"
          y2={30 + 180 - (WARNING_LINE / RESERVOIR_CAPACITY) * 180}
          stroke="#ed8936"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        <text x="245" y={35 + 180 - (WARNING_LINE / RESERVOIR_CAPACITY) * 180} fill="#ed8936" fontSize="8">
          预警线 {WARNING_LINE}
        </text>

        <line
          x1="40"
          y1={30 + 180 - (OVERFLOW_LINE / RESERVOIR_CAPACITY) * 180}
          x2="240"
          y2={30 + 180 - (OVERFLOW_LINE / RESERVOIR_CAPACITY) * 180}
          stroke="#f56565"
          strokeWidth="2"
          strokeDasharray="4,4"
        />
        <text x="245" y={35 + 180 - (OVERFLOW_LINE / RESERVOIR_CAPACITY) * 180} fill="#f56565" fontSize="8">
          溢洪线 {OVERFLOW_LINE}
        </text>

        <rect x="235" y="80" width="15" height="130" fill="url(#damGradient)" rx="2" />
        
        <rect
          x="238"
          y={80 + 130 - gateOpening * 1.3}
          width="9"
          height={gateOpening * 1.3}
          fill="#1a365d"
          rx="1"
        />
        
        {gateOpening > 0 && (
          <g>
            <path
              d={`M 242 ${80 + 130} Q ${260 + gateOpening * 0.3} ${100 + gateOpening}, ${300 + gateOpening * 0.5} ${210}`}
              fill="none"
              stroke="#4299e1"
              strokeWidth="3"
              opacity="0.8"
            >
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
            </path>
          </g>
        )}

        <text x="310" y="225" fill="#a0aec0" fontSize="10" textAnchor="middle">
          下游村镇
        </text>
        
        <g transform="translate(280, 200)">
          <rect x="0" y="0" width="15" height="18" fill="#718096" rx="1" />
          <polygon points="7.5,-5 17,3 -2,3" fill="#a0aec0" />
          <rect x="20" y="5" width="12" height="13" fill="#718096" rx="1" />
          <polygon points="26,1 34,7 18,7" fill="#a0aec0" />
        </g>

        {warningIssued && (
          <g>
            <circle cx="140" cy="20" r="12" fill="#ed8936" opacity="0.3">
              <animate attributeName="r" values="10;16;10" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1s" repeatCount="indefinite" />
            </circle>
            <text x="140" y="24" textAnchor="middle" fill="#ed8936" fontSize="14" fontWeight="bold">
              ⚠
            </text>
          </g>
        )}

        <text x="360" y="220" fill={riskStatus.color} fontSize="9" textAnchor="middle" fontWeight="600">
          {riskStatus.text}
        </text>

        <text x="140" y="235" textAnchor="middle" fill="#a0aec0" fontSize="8">
          水位: {reservoirLevel.toFixed(1)}
        </text>

        {weatherType === 'storm' || weatherType === 'heavyRain' ? (
          <g>
            {[...Array(15)].map((_, i) => (
              <line
                key={i}
                x1={50 + i * 20}
                y1={10 + (i % 3) * 10}
                x2={45 + i * 20}
                y2={25 + (i % 3) * 10}
                stroke="#90cdf4"
                strokeWidth="1"
                opacity="0.6"
              >
                <animate
                  attributeName="y1"
                  values={`${10 + (i % 3) * 10};${30 + (i % 3) * 10};${10 + (i % 3) * 10}`}
                  dur={`${0.5 + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              </line>
            ))}
          </g>
        ) : weatherType === 'moderateRain' || weatherType === 'lightRain' ? (
          <g>
            {[...Array(8)].map((_, i) => (
              <line
                key={i}
                x1={60 + i * 25}
                y1={15 + (i % 2) * 8}
                x2={55 + i * 25}
                y2={28 + (i % 2) * 8}
                stroke="#90cdf4"
                strokeWidth="1"
                opacity="0.5"
              >
                <animate
                  attributeName="y1"
                  values={`${15 + (i % 2) * 8};${30 + (i % 2) * 8};${15 + (i % 2) * 8}`}
                  dur={`${0.8 + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              </line>
            ))}
          </g>
        ) : null}
      </svg>

      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Waves className="w-3 h-3" />
          来水: {upstreamInflow}
        </span>
        <span>|</span>
        <span>泄洪: {(gateOpening * GATE_FLOW_RATE).toFixed(1)}</span>
      </div>
    </div>
  );
}
