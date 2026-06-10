import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { MAPlotPoint } from '@/types';

interface MAPlotProps {
  data: MAPlotPoint[];
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
        <p className="text-paper-600">Mean: {point.baseMean.toFixed(2)}</p>
        <p className={point.significant ? 'text-rust-red-600' : 'text-paper-500'}>
          {point.significant ? '显著差异' : '无显著差异'}
        </p>
      </div>
    );
  }
  return null;
};

export const MAPlot: React.FC<MAPlotProps> = ({ data, title, height = 350 }) => {
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-paper-800 mb-3 font-serif-sc">{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0DED8" />
          <XAxis
            type="number"
            dataKey="baseMean"
            name="Expression Mean"
            scale="log"
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: '#8B8A84' }}
            axisLine={{ stroke: '#C8C6BE' }}
            label={{ value: 'Mean Expression (log)', position: 'bottom', offset: 0, fontSize: 11, fill: '#6B6A66' }}
          />
          <YAxis
            type="number"
            dataKey="log2FoldChange"
            name="log2(Fold Change)"
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: '#8B8A84' }}
            axisLine={{ stroke: '#C8C6BE' }}
            label={{ value: 'log2(FC)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6B6A66' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#8B8A84" strokeDasharray="5 5" />
          <ReferenceLine y={1} stroke="#C44536" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={-1} stroke="#C44536" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Scatter
            name="Non-significant"
            data={data.filter(d => !d.significant)}
            fill="#AEACA3"
            fillOpacity={0.6}
          />
          <Scatter
            name="Significant"
            data={data.filter(d => d.significant)}
            fill="#C44536"
            fillOpacity={0.8}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
