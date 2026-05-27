import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { CriticalPoint, Interval, SignInterval } from '@/types';
import { PointType } from '@/types';
import { parseExpression, generateXValues } from '@/utils/math/expressionParser';

interface FunctionChartProps {
  expression: string;
  domain: Interval[];
  criticalPoints: CriticalPoint[];
  signIntervals: SignInterval[];
  inflectionPoints?: CriticalPoint[];
  width?: number;
  height?: number;
  showDerivative?: boolean;
  showSignRegions?: boolean;
}

const pointColors: Record<PointType, string> = {
  [PointType.CRITICAL]: '#6366f1',
  [PointType.MAXIMUM]: '#dc2626',
  [PointType.MINIMUM]: '#0d9488',
  [PointType.INFLECTION]: '#f59e0b',
  [PointType.NON_DIFFERENTIABLE]: '#7c3aed'
};

const pointLabels: Record<PointType, string> = {
  [PointType.CRITICAL]: '临',
  [PointType.MAXIMUM]: '大',
  [PointType.MINIMUM]: '小',
  [PointType.INFLECTION]: '拐',
  [PointType.NON_DIFFERENTIABLE]: '不'
};

export const FunctionChart: React.FC<FunctionChartProps> = ({
  expression,
  domain,
  criticalPoints,
  signIntervals,
  inflectionPoints = [],
  width = 800,
  height = 500,
  showDerivative = false,
  showSignRegions = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<CriticalPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const mathFn = parseExpression(expression);
    const xValues = generateXValues(domain, 300);
    const yValues = xValues.map(x => mathFn.evaluate(x)).filter(y => isFinite(y));

    const allX = criticalPoints.map(p => p.x);
    const allY = [...yValues, ...criticalPoints.map(p => p.y)];

    domain.forEach(interval => {
      allX.push(interval.start, interval.end);
    });

    const xMin = Math.min(...allX.filter(x => isFinite(x)));
    const xMax = Math.max(...allX.filter(x => isFinite(x)));
    const yMin = Math.min(...allY.filter(y => isFinite(y)));
    const yMax = Math.max(...allY.filter(y => isFinite(y)));

    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.15;

    const xScale = d3
      .scaleLinear()
      .domain([xMin - xPadding, xMax + xPadding])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([innerHeight, 0]);

    const xAxis = d3.axisBottom(xScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(8);

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(
        xAxis
          .tickSize(-innerHeight)
          .tickFormat(() => '')
      )
      .selectAll('.tick line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', 'grid')
      .call(
        yAxis
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('.tick line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280');

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '12px')
      .attr('fill', '#6b7280');

    const xZero = xScale(0);
    const yZero = yScale(0);

    if (xZero >= 0 && xZero <= innerWidth) {
      g.append('line')
        .attr('x1', xZero)
        .attr('x2', xZero)
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5);
    }

    if (yZero >= 0 && yZero <= innerHeight) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yZero)
        .attr('y2', yZero)
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5);
    }

    if (showSignRegions && signIntervals.length > 0) {
      signIntervals.forEach(interval => {
        if (interval.derivativeLevel !== 1) return;

        const xStart = xScale(Math.max(interval.interval.start, xMin - xPadding));
        const xEnd = xScale(Math.min(interval.interval.end, xMax + xPadding));
        const regionWidth = xEnd - xStart;

        if (regionWidth <= 0) return;

        const color = interval.sign === 'positive' ? '#0d9488' : '#dc2626';
        const opacity = 0.12;

        g.append('rect')
          .attr('x', xStart)
          .attr('y', 0)
          .attr('width', regionWidth)
          .attr('height', innerHeight)
          .attr('fill', color)
          .attr('opacity', opacity);
      });
    }

    const line = d3
      .line<number>()
      .x(d => xScale(d))
      .y(d => yScale(mathFn.evaluate(d)))
      .defined(d => isFinite(mathFn.evaluate(d)));

    g.append('path')
      .datum(xValues)
      .attr('fill', 'none')
      .attr('stroke', '#1e3a8a')
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    if (showDerivative && mathFn.derivative) {
      const derivativeLine = d3
        .line<number>()
        .x(d => xScale(d))
        .y(d => yScale(mathFn.derivative!(d)))
        .defined(d => isFinite(mathFn.derivative!(d)));

      g.append('path')
        .datum(xValues)
        .attr('fill', 'none')
        .attr('stroke', '#6366f1')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7)
        .attr('d', derivativeLine);
    }

    const allPoints = [...criticalPoints, ...inflectionPoints];

    g.selectAll('.critical-point')
      .data(allPoints)
      .enter()
      .append('g')
      .attr('class', 'critical-point')
      .attr('transform', d => `translate(${xScale(d.x)}, ${yScale(d.y)})`)
      .each(function(d) {
        const group = d3.select(this);
        const color = pointColors[d.type];

        group.append('circle')
          .attr('r', d.type === PointType.NON_DIFFERENTIABLE ? 10 : 8)
          .attr('fill', color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseenter', function(event) {
            setHoveredPoint(d);
            setTooltipPos({ x: event.offsetX, y: event.offsetY });
            d3.select(this).transition().duration(150).attr('r', d.type === PointType.NON_DIFFERENTIABLE ? 13 : 11);
          })
          .on('mouseleave', function() {
            setHoveredPoint(null);
            d3.select(this).transition().duration(150).attr('r', d.type === PointType.NON_DIFFERENTIABLE ? 10 : 8);
          });

        group.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(pointLabels[d.type]);
      });

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .text('x');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .text('f(x)');
  }, [expression, domain, criticalPoints, signIntervals, inflectionPoints, width, height, showDerivative, showSignRegions]);

  return (
    <div ref={containerRef} className="relative bg-white rounded-xl shadow-lg p-4">
      <svg
        ref={svgRef}
        id="function-chart"
        width={width}
        height={height}
        className="mx-auto"
      />

      {hoveredPoint && (
        <div
          className="absolute z-10 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl pointer-events-none"
          style={{
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 30,
            maxWidth: '200px'
          }}
        >
          <div className="font-bold mb-1" style={{ color: pointColors[hoveredPoint.type] }}>
            {getPointTypeName(hoveredPoint.type)}
          </div>
          <div className="text-gray-300">
            x = {hoveredPoint.x.toFixed(4)}
          </div>
          <div className="text-gray-300">
            y = {hoveredPoint.y.toFixed(4)}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-red-600"></span>
          <span className="text-gray-600">极大值点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-teal-600"></span>
          <span className="text-gray-600">极小值点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-amber-500"></span>
          <span className="text-gray-600">拐点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-violet-600"></span>
          <span className="text-gray-600">不可导点</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-3 bg-teal-600 opacity-20 border border-teal-600"></span>
          <span className="text-gray-600">递增区间</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-3 bg-red-600 opacity-20 border border-red-600"></span>
          <span className="text-gray-600">递减区间</span>
        </div>
      </div>
    </div>
  );
};

function getPointTypeName(type: PointType): string {
  const names: Record<PointType, string> = {
    [PointType.CRITICAL]: '临界点',
    [PointType.MAXIMUM]: '极大值点',
    [PointType.MINIMUM]: '极小值点',
    [PointType.INFLECTION]: '拐点',
    [PointType.NON_DIFFERENTIABLE]: '不可导点'
  };
  return names[type];
}
