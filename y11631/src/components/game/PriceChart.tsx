import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { PricePoint } from '../../engine/types';

interface PriceChartProps {
  priceHistory: PricePoint[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ priceHistory }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1E293B' },
        textColor: '#94A3B8',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: false,
      handleScale: false,
    });

    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(16, 185, 129, 0.3)',
      bottomColor: 'rgba(16, 185, 129, 0.05)',
      lineColor: '#10B981',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || priceHistory.length < 2) return;

    const data = priceHistory.map((point) => ({
      time: (point.time / 1000) as UTCTimestamp,
      value: point.price,
    }));

    seriesRef.current.setData(data);
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [priceHistory]);

  return (
    <div className="bg-terminal-panel rounded-lg border border-terminal-border overflow-hidden">
      <div className="px-4 py-2 border-b border-terminal-border">
        <h3 className="text-sm font-semibold text-gray-300">价格走势</h3>
      </div>
      <div ref={chartContainerRef} className="h-48 w-full" />
    </div>
  );
};
