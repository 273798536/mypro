import React, { useRef, useEffect, useMemo } from 'react';
import { useSimulationStore } from '@/store/simulationStore';
import { getPressureHistory } from '@/engine/waterHammer';

const CHART_PADDING = { top: 20, right: 60, bottom: 40, left: 60 };
const MAX_PRESSURE = 1.2;
const WARNING_PRESSURE = 1.0;

const NODE_COLORS: { [nodeId: string]: string } = {
  N5: '#2563eb',
  N6: '#dc2626',
  N7: '#059669',
};

const NODE_LABELS: { [nodeId: string]: string } = {
  N5: '北测点',
  N6: '南测点',
  N7: '末端用户',
};

export const PressureChart: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    pressureData,
    valveActions,
    issues,
    currentTime,
    duration,
    selectedIssueId,
    selectIssue,
    setHoveredElement,
  } = useSimulationStore();

  const displayNodes = ['N5', 'N6', 'N7'];

  const chartData = useMemo(() => {
    return displayNodes.map(nodeId => ({
      nodeId,
      history: getPressureHistory(pressureData, nodeId, duration),
    }));
  }, [pressureData, duration]);

  const currentData = useMemo(() => {
    return displayNodes.map(nodeId => ({
      nodeId,
      history: getPressureHistory(pressureData, nodeId, currentTime),
    }));
  }, [pressureData, currentTime]);

  const peakPoints = useMemo(() => {
    const peaks: { time: number; pressure: number; nodeId: string }[] = [];
    displayNodes.forEach(nodeId => {
      const history = getPressureHistory(pressureData, nodeId, duration);
      let maxPressure = 0;
      let maxTime = 0;
      history.forEach(h => {
        if (h.pressure > maxPressure) {
          maxPressure = h.pressure;
          maxTime = h.time;
        }
      });
      if (maxPressure > WARNING_PRESSURE) {
        peaks.push({ time: maxTime, pressure: maxPressure, nodeId });
      }
    });
    return peaks;
  }, [pressureData, duration]);

  const driftIssue = useMemo(() => {
    return issues.find(i => i.type === 'sensor_drift');
  }, [issues]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = 280;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
    const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

    const timeToX = (time: number) => {
      return CHART_PADDING.left + (time / duration) * chartWidth;
    };

    const pressureToY = (pressure: number) => {
      return CHART_PADDING.top + chartHeight - (pressure / MAX_PRESSURE) * chartHeight;
    };

    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(
      CHART_PADDING.left,
      CHART_PADDING.top,
      chartWidth,
      pressureToY(WARNING_PRESSURE) - CHART_PADDING.top
    );

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= MAX_PRESSURE; i += 0.2) {
      const y = pressureToY(i);
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, y);
      ctx.lineTo(CHART_PADDING.left + chartWidth, y);
      ctx.stroke();
    }

    for (let i = 0; i <= duration; i += 2) {
      const x = timeToX(i);
      ctx.beginPath();
      ctx.moveTo(x, CHART_PADDING.top);
      ctx.lineTo(x, CHART_PADDING.top + chartHeight);
      ctx.strokeStyle = i % 5 === 0 ? '#d1d5db' : '#e5e7eb';
      ctx.stroke();
    }

    ctx.setLineDash([6, 3]);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    const warningY = pressureToY(WARNING_PRESSURE);
    ctx.beginPath();
    ctx.moveTo(CHART_PADDING.left, warningY);
    ctx.lineTo(CHART_PADDING.left + chartWidth, warningY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('警戒线 1.0 MPa', CHART_PADDING.left + 5, warningY - 5);

    valveActions.forEach(va => {
      const x = timeToX(va.actualTime);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, CHART_PADDING.top);
      ctx.lineTo(x, CHART_PADDING.top + chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      const isHighlighted = selectedIssueId && issues.some(
        i => i.type === 'valve_timing' && i.location.includes(va.valveId) &&
          Math.abs(i.timePoint - va.actualTime) < 0.1
      );

      ctx.fillStyle = isHighlighted ? '#dc2626' : '#fee2e2';
      ctx.fillRect(x - 15, CHART_PADDING.top - 18, 30, 16);
      ctx.strokeStyle = isHighlighted ? '#dc2626' : '#fca5a5';
      ctx.lineWidth = isHighlighted ? 2 : 1;
      ctx.strokeRect(x - 15, CHART_PADDING.top - 18, 30, 16);
      ctx.fillStyle = isHighlighted ? 'white' : '#dc2626';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(va.action === 'close' ? '关阀' : '开阀', x, CHART_PADDING.top - 6);
    });

    currentData.forEach(({ nodeId, history }) => {
      if (history.length < 2) return;
      
      ctx.strokeStyle = NODE_COLORS[nodeId];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(timeToX(history[0].time), pressureToY(history[0].pressure));
      
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(timeToX(history[i].time), pressureToY(history[i].pressure));
      }
      ctx.stroke();
    });

    chartData.forEach(({ nodeId, history }) => {
      if (history.length < 2) return;
      
      ctx.strokeStyle = NODE_COLORS[nodeId];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(timeToX(history[0].time), pressureToY(history[0].pressure));
      
      for (let i = 1; i < history.length; i++) {
        ctx.lineTo(timeToX(history[i].time), pressureToY(history[i].pressure));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    peakPoints.forEach(peak => {
      const x = timeToX(peak.time);
      const y = pressureToY(peak.pressure);
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = NODE_COLORS[peak.nodeId];
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = NODE_COLORS[peak.nodeId];
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${peak.pressure.toFixed(2)}`, x, y - 10);
    });

    if (driftIssue && currentTime >= driftIssue.timePoint) {
      const nodeId = 'N6';
      const x = timeToX(driftIssue.timePoint);
      const y = pressureToY(0.6);
      
      ctx.fillStyle = '#fff7ed';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.fillRect(x - 50, y - 15, 100, 30);
      ctx.strokeRect(x - 50, y - 15, 100, 30);
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`传感器漂移 +${driftIssue.deviation?.toFixed(2)} MPa`, x, y + 5);
    }

    const currentX = timeToX(currentTime);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(currentX, CHART_PADDING.top);
    ctx.lineTo(currentX, CHART_PADDING.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(currentX, CHART_PADDING.top + chartHeight);
    ctx.lineTo(currentX - 8, CHART_PADDING.top + chartHeight + 12);
    ctx.lineTo(currentX + 8, CHART_PADDING.top + chartHeight + 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= MAX_PRESSURE; i += 0.2) {
      ctx.fillText(i.toFixed(1), CHART_PADDING.left - 8, pressureToY(i) + 4);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i <= duration; i += 2) {
      ctx.fillText(`${i}s`, timeToX(i), CHART_PADDING.top + chartHeight + 20);
    }

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('时间 (s)', width / 2, height - 8);

    ctx.save();
    ctx.translate(18, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('压力 (MPa)', 0, 0);
    ctx.restore();

  }, [currentData, chartData, currentTime, duration, valveActions, peakPoints, driftIssue, selectedIssueId, issues]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartWidth = rect.width - CHART_PADDING.left - CHART_PADDING.right;
    
    const time = ((x - CHART_PADDING.left) / chartWidth) * duration;
    if (time >= 0 && time <= duration) {
      const action = valveActions.find(va => Math.abs(va.actualTime - time) < 0.5);
      if (action) {
        const issue = issues.find(
          i => i.type === 'valve_timing' && i.location.includes(action.valveId)
        );
        if (issue) {
          selectIssue(issue.id);
        }
      }
    }
  };

  return (
    <div className="w-full h-full bg-white border-2 border-gray-300 rounded relative overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-gray-300 flex items-center justify-between">
        <span className="font-bold text-sm text-gray-800">水锤压力波形图</span>
        <div className="flex items-center gap-3">
          {displayNodes.map(nodeId => (
            <div key={nodeId} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: NODE_COLORS[nodeId] }}
              ></div>
              <span className="text-[10px] font-mono text-gray-600">
                {NODE_LABELS[nodeId]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseMove={(e) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;
            const x = e.clientX - rect.left;
            const chartWidth = rect.width - CHART_PADDING.left - CHART_PADDING.right;
            const time = ((x - CHART_PADDING.left) / chartWidth) * duration;
            
            displayNodes.forEach(nodeId => {
              const history = getPressureHistory(pressureData, nodeId, Math.min(time, currentTime));
              if (history.length > 0) {
                const last = history[history.length - 1];
                if (Math.abs(last.time - time) < 0.2) {
                  setHoveredElement({ type: 'node', id: nodeId });
                }
              }
            });
          }}
          onMouseLeave={() => setHoveredElement(null)}
        />
      </div>

      <div className="px-3 py-2 border-t border-gray-300 flex items-center gap-4 text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-gray-400" style={{ opacity: 0.3 }}></div>
          <span className="text-gray-500">全量数据</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-blue-600"></div>
          <span className="text-gray-500">已播放</span>
        </div>
        {driftIssue && (
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-3 h-3 bg-amber-400 rounded"></div>
            <span className="text-amber-700">[3] 传感器漂移</span>
          </div>
        )}
      </div>
    </div>
  );
};
