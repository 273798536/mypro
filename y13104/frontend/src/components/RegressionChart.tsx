import { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Line,
} from 'recharts';
import type { RegressionChartData, ScatterPoint } from '../types';

interface Props {
  data: RegressionChartData;
  onPointClick?: (point: ScatterPoint) => void;
}

const STATUS_COLOR: Record<string, string> = {
  processed: '#74b9ff',
  pending_material: '#ff7675',
  manual_overrule: '#a29bfe',
};

export default function RegressionChart({ data, onPointClick }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<ScatterPoint | null>(null);

  const allPoints = data.points.map(p => ({
    ...p,
    color: p.is_anomaly ? '#ff4757' : (STATUS_COLOR[p.review_status] || '#74b9ff'),
    size: p.is_anomaly ? 6 : 3,
  }));

  const lineData: Record<string, any>[] = [];
  data.fitted_lines.forEach((line, idx) => {
    lineData.push({ segment: idx, x: line.x1, yLine: line.y1 });
    lineData.push({ segment: idx, x: line.x2, yLine: line.y2 });
  });

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0]?.payload;
      if (!p) return null;
      return (
        <div style={{ background: '#fff', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}>
          <div><strong>{p.security_code || '未知'}</strong> {p.security_name || ''}</div>
          <div>X: {p.x?.toFixed(4)}</div>
          <div>Y: {p.y?.toFixed(4)}</div>
          {p.is_anomaly && <div style={{ color: '#ff4757' }}>⚠ 异常点</div>}
          <div>状态: {p.review_status}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f2f6" />
            <XAxis type="number" dataKey="x" name="X值" stroke="#57606f" />
            <YAxis type="number" dataKey="y" name="Y值" stroke="#57606f" />
            <Tooltip content={customTooltip} />
            <Legend />

            {data.breakpoints.map((bp, i) => (
              <ReferenceLine key={`bp-${i}`} x={bp} stroke="#ffa502" strokeDasharray="5 5" label={`断点${i + 1}`} />
            ))}

            {data.fitted_lines.map((line, idx) => (
              <Line
                key={`fit-${idx}`}
                data={[
                  { x: line.x1, yLine: line.y1 },
                  { x: line.x2, yLine: line.y2 },
                ]}
                type="linear"
                dataKey="yLine"
                stroke="#2ed573"
                strokeWidth={2}
                dot={false}
                name={`分段${idx + 1}拟合线`}
                legendType="line"
              />
            ))}

            <Scatter
              name="正常点"
              data={allPoints.filter(p => !p.is_anomaly)}
              fill="#74b9ff"
              shape="circle"
            />
            <Scatter
              name="异常点"
              data={allPoints.filter(p => p.is_anomaly)}
              fill="#ff4757"
              shape="star"
              onClick={(e: any) => {
                if (onPointClick && e?.payload) {
                  onPointClick(e.payload);
                }
              }}
              style={{ cursor: 'pointer' }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {data.r_squared != null && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#747d8c', textAlign: 'right' }}>
          R² = {data.r_squared.toFixed(4)}
        </div>
      )}
    </div>
  );
}
