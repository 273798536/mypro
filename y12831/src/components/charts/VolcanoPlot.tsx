import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { VolcanoPoint } from '@/types';

interface VolcanoPlotProps {
  data: VolcanoPoint[];
  title: string;
  height?: number;
}

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-card border border-paper-200 text-sm">
        <p className="font-medium text-paper-900">{point.gene}</p>
        <p className="text-paper-600">log2(FC): {point.log2FoldChange.toFixed(3)}</p>
        <p className="text-paper-600">-log10(P): {point.negLog10Pvalue.toFixed(3)}</p>
        <p className={point.regulated === 'up' ? 'text-rust-red-600' : point.regulated === 'down' ? 'text-deep-sea-600' : 'text-paper-500'}>
          {point.regulated === 'up' ? '上调' : point.regulated === 'down' ? '下调' : '无显著变化'}
        </p>
      </div>
    );
  }
  return null;
};

export const VolcanoPlot: React.FC<VolcanoPlotProps> = ({ data, title, height = 350 }) => {
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-paper-800 mb-3 font-serif-sc">{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0DED8" />
          <XAxis
            type="number"
            dataKey="log2FoldChange"
            name="log2(Fold Change)"
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: '#8B8A84' }}
            axisLine={{ stroke: '#C8C6BE' }}
            label={{ value: 'log2(Fold Change)', position: 'bottom', offset: 0, fontSize: 11, fill: '#6B6A66' }}
          />
          <YAxis
            type="number"
            dataKey="negLog10Pvalue"
            name="-log10(P-value)"
            domain={[0, 'auto']}
            tick={{ fontSize: 11, fill: '#8B8A84' }}
            axisLine={{ stroke: '#C8C6BE' }}
            label={{ value: '-log10(P-value)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6B6A66' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={1} stroke="#C44536" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine x={-1} stroke="#0F3B5F" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={2} stroke="#8B8A84" strokeDasharray="5 5" />
          <Scatter
            name="Non-significant"
            data={data.filter(d => d.regulated === 'none')}
            fill="#AEACA3"
            fillOpacity={0.6}
          />
          <Scatter
            name="Up-regulated"
            data={data.filter(d => d.regulated === 'up')}
            fill="#C44536"
            fillOpacity={0.8}
          />
          <Scatter
            name="Down-regulated"
            data={data.filter(d => d.regulated === 'down')}
            fill="#0F3B5F"
            fillOpacity={0.8}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
