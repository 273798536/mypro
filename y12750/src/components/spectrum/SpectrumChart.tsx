import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, LineChart } from 'lucide-react';
import type { SpectrumData } from '../../types';
import { generateSvgPath, getAxisTicks } from '../../utils/spectrum';

interface Props {
  spectrum: SpectrumData;
}

const WIDTH = 560;
const HEIGHT = 340;
const PADDING = 48;

export default function SpectrumChart({ spectrum }: Props) {
  const { volumes, phValues } = getAxisTicks();
  const path = useMemo(
    () => generateSvgPath(spectrum.points, WIDTH, HEIGHT, PADDING),
    [spectrum.points]
  );

  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;
  const maxVolume = 25;
  const maxPh = 14;

  const xFor = (v: number) => PADDING + (v / maxVolume) * innerWidth;
  const yFor = (ph: number) => PADDING + innerHeight - (ph / maxPh) * innerHeight;

  const hasJump = spectrum.jumpRange.start > 0 && spectrum.jumpRange.end > 0;
  const endpointX = hasJump ? xFor(spectrum.endpointVolume) : 0;
  const endpointY = hasJump ? yFor(spectrum.endpointPh) : 0;
  const jumpStartX = hasJump ? xFor(spectrum.jumpRange.start) : 0;
  const jumpEndX = hasJump ? xFor(spectrum.jumpRange.end) : 0;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-lab-blue font-semibold flex items-center gap-2 mb-4">
        <span className="w-1 h-6 bg-lab-blue rounded-full" />
        谱图判读（pH-V 滴定曲线）
      </h3>

      <div className="bg-white rounded-sm-plus border border-paper-dark p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          style={{ maxHeight: 380 }}
        >
          <defs>
            <linearGradient id="jumpHighlight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2E7D5B" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2E7D5B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Y 轴刻度线和标签 */}
          {phValues.map((ph) => (
            <g key={`y-${ph}`}>
              <line
                x1={PADDING}
                x2={WIDTH - PADDING}
                y1={yFor(ph)}
                y2={yFor(ph)}
                stroke={ph === 7 ? '#D4A017' : '#EDE9E0'}
                strokeWidth={ph === 7 ? 1.5 : 0.8}
                strokeDasharray={ph === 7 ? '4 2' : undefined}
              />
              <text
                x={PADDING - 10}
                y={yFor(ph) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#888"
                fontFamily="JetBrains Mono, monospace"
              >
                {ph}
              </text>
            </g>
          ))}

          {/* X 轴刻度线和标签 */}
          {volumes.map((v) => (
            <g key={`x-${v}`}>
              <line
                x1={xFor(v)}
                x2={xFor(v)}
                y1={PADDING}
                y2={HEIGHT - PADDING}
                stroke="#EDE9E0"
                strokeWidth="0.5"
              />
              <text
                x={xFor(v)}
                y={HEIGHT - PADDING + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#888"
                fontFamily="JetBrains Mono, monospace"
              >
                {v}
              </text>
            </g>
          ))}

          {/* 突跃范围高亮 */}
          {hasJump && (
            <rect
              x={jumpStartX}
              y={PADDING}
              width={jumpEndX - jumpStartX}
              height={innerHeight}
              fill="url(#jumpHighlight)"
            />
          )}

          {/* 坐标轴 */}
          <line
            x1={PADDING}
            x2={PADDING}
            y1={PADDING}
            y2={HEIGHT - PADDING}
            stroke="#1E3A5F"
            strokeWidth="1.5"
          />
          <line
            x1={PADDING}
            x2={WIDTH - PADDING}
            y1={HEIGHT - PADDING}
            y2={HEIGHT - PADDING}
            stroke="#1E3A5F"
            strokeWidth="1.5"
          />

          {/* 轴标签 */}
          <text
            x={WIDTH / 2}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="12"
            fill="#1E3A5F"
            fontWeight="600"
          >
            V (mL) 滴定剂体积
          </text>
          <text
            x={14}
            y={HEIGHT / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#1E3A5F"
            fontWeight="600"
            transform={`rotate(-90 14 ${HEIGHT / 2})`}
          >
            pH
          </text>

          {/* 滴定曲线 */}
          <path
            d={path}
            fill="none"
            stroke="#1E3A5F"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="spectrum-stroke"
          />

          {/* 终点标记 */}
          {hasJump && (
            <g>
              <circle cx={endpointX} cy={endpointY} r="8" fill="#2E7D5B" opacity="0.2">
                <animate
                  attributeName="r"
                  values="6;12;6"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={endpointX} cy={endpointY} r="5" fill="#2E7D5B" stroke="white" strokeWidth="2" />
              <line
                x1={endpointX}
                x2={endpointX}
                y1={endpointY}
                y2={HEIGHT - PADDING}
                stroke="#2E7D5B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <rect
                x={endpointX + 10}
                y={endpointY - 28}
                width="110"
                height="24"
                rx="4"
                fill="#2E7D5B"
              />
              <text
                x={endpointX + 15}
                y={endpointY - 12}
                fontSize="11"
                fill="white"
                fontFamily="JetBrains Mono, monospace"
              >
                终点 {spectrum.endpointVolume.toFixed(1)}mL / pH{spectrum.endpointPh.toFixed(2)}
              </text>
            </g>
          )}

          {/* 数据点 */}
          {spectrum.points.filter((_, i) => i % 4 === 0).map((p, i) => (
            <circle
              key={i}
              cx={xFor(p.volume)}
              cy={yFor(p.ph)}
              r="2.5"
              fill="#1E3A5F"
              opacity="0.6"
            />
          ))}
        </svg>
      </div>

      {/* 谱图判读说明 */}
      <div
        className={`p-4 rounded-sm-plus border flex items-start gap-3 ${
          hasJump
            ? 'bg-lab-green/8 border-lab-green/30'
            : 'bg-lab-red/8 border-lab-red/30'
        }`}
      >
        {hasJump ? (
          <CheckCircle2 size={20} className="text-lab-green shrink-0 mt-0.5" />
        ) : (
          <AlertCircle size={20} className="text-lab-red shrink-0 mt-0.5" />
        )}
        <div>
          <div className={`font-semibold text-sm ${hasJump ? 'text-lab-green' : 'text-lab-red'}`}>
            {hasJump ? '谱图判读：正常' : '谱图判读：异常'}
          </div>
          <div className="text-sm text-gray-600 mt-1 leading-relaxed">
            {spectrum.note ||
              (hasJump
                ? `突跃范围 ${spectrum.jumpRange.start.toFixed(1)}-${spectrum.jumpRange.end.toFixed(1)} mL，终点清晰可辨。`
                : '未检测到明显突跃，请检查电极操作、滴定剂浓度或原始谱图数据。')}
          </div>
          {hasJump && (
            <div className="text-xs text-gray-500 mt-2 font-mono-chem">
              突跃 ΔpH ≈ 7.4，满足强酸强碱滴定判读要求
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
