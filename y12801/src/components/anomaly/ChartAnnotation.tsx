import type { Sample } from '@/types';

interface ChartAnnotationProps {
  oldSamples: Sample[];
  newSamples: Sample[];
  chartBounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  chartWidth: number;
  chartHeight: number;
}

interface Annotation {
  id: string;
  type: 'moved' | 'added' | 'removed';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
}

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };
const PLOT_W = (w: number) => w - MARGIN.left - MARGIN.right;
const PLOT_H = (h: number) => h - MARGIN.top - MARGIN.bottom;

function dataToPixel(
  dataX: number,
  dataY: number,
  bounds: ChartAnnotationProps['chartBounds'],
  chartWidth: number,
  chartHeight: number
): { px: number; py: number } {
  const { xMin, xMax, yMin, yMax } = bounds;
  const pw = PLOT_W(chartWidth);
  const ph = PLOT_H(chartHeight);
  const rangeX = xMax - xMin || 1;
  const rangeY = yMax - yMin || 1;
  return {
    px: MARGIN.left + ((dataX - xMin) / rangeX) * pw,
    py: MARGIN.top + ph - ((dataY - yMin) / rangeY) * ph,
  };
}

export default function ChartAnnotation({
  oldSamples,
  newSamples,
  chartBounds,
  chartWidth,
  chartHeight,
}: ChartAnnotationProps) {
  const oldById = new Map(oldSamples.map(s => [s.id, s]));
  const newById = new Map(newSamples.map(s => [s.id, s]));

  const annotations: Annotation[] = [];

  for (const oldS of oldSamples) {
    const newS = newById.get(oldS.id);
    if (!newS) {
      const { px, py } = dataToPixel(oldS.umapX, oldS.umapY, chartBounds, chartWidth, chartHeight);
      annotations.push({ id: oldS.id, type: 'removed', fromX: px, fromY: py, toX: px, toY: py, label: oldS.sampleName });
    } else if (oldS.umapX !== newS.umapX || oldS.umapY !== newS.umapY) {
      const from = dataToPixel(oldS.umapX, oldS.umapY, chartBounds, chartWidth, chartHeight);
      const to = dataToPixel(newS.umapX, newS.umapY, chartBounds, chartWidth, chartHeight);
      annotations.push({ id: oldS.id, type: 'moved', fromX: from.px, fromY: from.py, toX: to.px, toY: to.py, label: oldS.sampleName });
    }
  }

  for (const newS of newSamples) {
    if (!oldById.has(newS.id)) {
      const { px, py } = dataToPixel(newS.umapX, newS.umapY, chartBounds, chartWidth, chartHeight);
      annotations.push({ id: newS.id, type: 'added', fromX: px, fromY: py, toX: px, toY: py, label: newS.sampleName });
    }
  }

  return (
    <svg
      width={chartWidth}
      height={chartHeight}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#0f766e" />
        </marker>
      </defs>

      {annotations.map(ann => {
        if (ann.type === 'moved') {
          return (
            <g key={ann.id}>
              <line
                x1={ann.fromX}
                y1={ann.fromY}
                x2={ann.toX}
                y2={ann.toY}
                stroke="#0f766e"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                markerEnd="url(#arrowhead)"
              />
              <g transform={`translate(${ann.fromX}, ${ann.fromY})`}>
                <circle r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 2" />
              </g>
              <g transform={`translate(${ann.toX}, ${ann.toY})`}>
                <circle r={4} fill="#0f766e" stroke="none" />
              </g>
              <g transform={`translate(${(ann.fromX + ann.toX) / 2}, ${(ann.fromY + ann.toY) / 2 - 8})`}>
                <rect x={-20} y={-8} width={40} height={16} rx={3} fill="white" fillOpacity={0.85} stroke="#0f766e" strokeWidth={0.5} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="#0f766e" fontFamily="'Noto Sans SC', sans-serif">
                  {ann.label}
                </text>
              </g>
            </g>
          );
        }

        if (ann.type === 'added') {
          const size = 6;
          return (
            <g key={ann.id} transform={`translate(${ann.toX}, ${ann.toY})`}>
              <polygon
                points={`0 ${-size}, ${size * 0.87} ${size * 0.5}, ${-size * 0.87} ${size * 0.5}`}
                fill="#16a34a"
                stroke="none"
              />
              <g transform={`translate(0, ${-size - 6})`}>
                <rect x={-20} y={-8} width={40} height={16} rx={3} fill="white" fillOpacity={0.85} stroke="#16a34a" strokeWidth={0.5} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="#16a34a" fontFamily="'Noto Sans SC', sans-serif">
                  {ann.label}
                </text>
              </g>
            </g>
          );
        }

        if (ann.type === 'removed') {
          const size = 5;
          return (
            <g key={ann.id} transform={`translate(${ann.fromX}, ${ann.fromY})`}>
              <line x1={-size} y1={-size} x2={size} y2={size} stroke="#dc2626" strokeWidth={2} />
              <line x1={size} y1={-size} x2={-size} y2={size} stroke="#dc2626" strokeWidth={2} />
              <g transform={`translate(0, ${-size - 8})`}>
                <rect x={-20} y={-8} width={40} height={16} rx={3} fill="white" fillOpacity={0.85} stroke="#dc2626" strokeWidth={0.5} />
                <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="#dc2626" fontFamily="'Noto Sans SC', sans-serif">
                  {ann.label}
                </text>
              </g>
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
}
