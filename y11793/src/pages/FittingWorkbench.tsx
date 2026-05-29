import React, { useRef, useMemo, useState } from 'react';
import { Battery, Activity } from 'lucide-react';
import { useFittingStore } from '@/store/fittingStore';
import RCModelScene from '@/components/RCModelScene';
import FittingChart from '@/components/FittingChart';
import ResidualChart from '@/components/ResidualChart';
import ParameterCards from '@/components/ParameterCards';
import AlertCenter from '@/components/AlertCenter';
import ExportToolbar from '@/components/ExportToolbar';
import DataInputPanel from '@/components/DataInputPanel';
import CorrectionTimeline from '@/components/CorrectionTimeline';
import type { ResidualStats, RCParams, ParameterBounds } from '@/types';
import type { AlertSeverity } from '@/shared/types';

type ComponentType = 'ocv' | 'R0' | 'R1' | 'C1';

export default function FittingWorkbench() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentType | null>(null);
  
  const {
    currentSession,
    times,
    voltages,
    currents,
    rawData,
    initialParams,
    parameterBounds,
    fittedParams,
    residuals,
    alerts,
    corrections,
    dataSources,
    isFitting,
  } = useFittingStore();

  const sessionData = useMemo(() => ({
    session: currentSession,
    rawData,
    dataSources,
    initialParams,
    parameterBounds,
    fittedParams,
    residuals,
    alerts,
    corrections,
  }), [currentSession, rawData, dataSources, initialParams, parameterBounds, fittedParams, residuals, alerts, corrections]);

  const fittedVoltages = useMemo(() => {
    if (fittedParams.length === 0 || times.length === 0) return undefined;
    
    const ocv = fittedParams.find(p => p.name === 'ocv')?.value || initialParams.ocv;
    const R0 = fittedParams.find(p => p.name === 'R0')?.value || initialParams.R0;
    const R1 = fittedParams.find(p => p.name === 'R1')?.value || initialParams.R1;
    const C1 = fittedParams.find(p => p.name === 'C1')?.value || initialParams.C1;
    const tau1 = R1 * C1;
    
    return times.map((t, idx) => {
      const i = currents[idx] || 0;
      return tau1 > 0
        ? ocv - i * R0 - i * R1 * (1 - Math.exp(-t / tau1))
        : ocv - i * R0 - i * R1;
    });
  }, [fittedParams, times, currents, initialParams]);

  const residualStats = useMemo((): ResidualStats => {
    if (residuals.length === 0) {
      return { mean: 0, stdDev: 0, max: 0, min: 0 };
    }
    
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const variance = residuals.reduce((a, b) => a + (b - mean) ** 2, 0) / residuals.length;
    const stdDev = Math.sqrt(variance);
    const max = Math.max(...residuals);
    const min = Math.min(...residuals);
    
    return { mean, stdDev, max, min };
  }, [residuals]);

  const qualityInfo = useMemo(() => {
    if (!currentSession || fittedParams.length === 0) return undefined;
    return {
      rSquared: currentSession.rSquared,
      rmse: currentSession.rmse,
      iterations: fittedParams[0]?.iteration,
    };
  }, [currentSession, fittedParams]);

  const modelParams = useMemo((): RCParams => {
    if (fittedParams.length === 0) {
      return {
        ocv: initialParams.ocv,
        R0: initialParams.R0,
        R1: initialParams.R1,
        C1: initialParams.C1,
      };
    }
    return {
      ocv: fittedParams.find(p => p.name === 'ocv')?.value || initialParams.ocv,
      R0: fittedParams.find(p => p.name === 'R0')?.value || initialParams.R0,
      R1: fittedParams.find(p => p.name === 'R1')?.value || initialParams.R1,
      C1: fittedParams.find(p => p.name === 'C1')?.value || initialParams.C1,
    };
  }, [fittedParams, initialParams]);

  const modelBounds = useMemo((): ParameterBounds => {
    return {
      ocv: [parameterBounds.ocv?.min ?? 2.5, parameterBounds.ocv?.max ?? 4.2],
      R0: [parameterBounds.R0.min, parameterBounds.R0.max],
      R1: [parameterBounds.R1.min, parameterBounds.R1.max],
      C1: [parameterBounds.C1.min, parameterBounds.C1.max],
    };
  }, [parameterBounds]);

  const highestSeverity = useMemo((): AlertSeverity | undefined => {
    if (alerts.length === 0) return undefined;
    if (alerts.some(a => a.severity === 'fatal')) return 'fatal';
    if (alerts.some(a => a.severity === 'severe')) return 'severe';
    return 'warning';
  }, [alerts]);

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white flex flex-col">
      <header className="bg-[#16162a] border-b border-[#2a2a4e] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Battery className="text-[#00d4ff]" size={24} />
          <div>
            <h1 className="text-xl font-bold text-[#00d4ff]">电池RC等效拟合工作台</h1>
            <p className="text-xs text-gray-500">一阶RC等效电路模型参数辨识</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {currentSession && (
            <div className="flex items-center gap-2 text-sm">
              <Activity size={14} className="text-emerald-400" />
              <span className="text-gray-400">会话:</span>
              <span className="font-mono text-gray-300">{currentSession.id.slice(0, 8)}</span>
              {isFitting && (
                <span className="px-2 py-0.5 bg-[#ff8c00]/20 text-[#ff8c00] rounded text-xs animate-pulse">
                  拟合中...
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4">
            <AlertCenter />
          </div>
          
          <div className="flex-1 flex overflow-hidden px-4 pb-4">
            <div className="w-3/5 flex flex-col gap-4 pr-4">
              <div className="flex-1 min-h-0">
                <RCModelScene
                  params={modelParams}
                  bounds={modelBounds}
                  selectedComponent={selectedComponent}
                  onComponentSelect={setSelectedComponent}
                  hasAlerts={alerts.length > 0}
                  alertSeverity={highestSeverity}
                />
              </div>
              <div className="h-64">
                <CorrectionTimeline maxItems={3} />
              </div>
            </div>
            
            <div ref={chartContainerRef} className="w-2/5 flex flex-col gap-4">
              <div className="flex-1 min-h-0">
                <FittingChart
                  times={times}
                  voltages={voltages}
                  fittedVoltages={fittedVoltages}
                  currents={currents}
                />
              </div>
              <div className="flex-1 min-h-0">
                {residuals.length > 0 ? (
                  <ResidualChart
                    times={times}
                    residuals={residuals}
                    residualStats={residualStats}
                  />
                ) : (
                  <div className="w-full h-full bg-[#16162a] rounded-lg p-4 border border-[#2a2a4e] flex items-center justify-center">
                    <p className="text-gray-500 text-sm">拟合完成后显示残差图</p>
                  </div>
                )}
              </div>
              <div>
                <ParameterCards
                  parameters={fittedParams}
                  rSquared={qualityInfo?.rSquared}
                  rmse={qualityInfo?.rmse}
                  iterations={qualityInfo?.iterations}
                />
              </div>
            </div>
          </div>
          
          <div className="px-4 pb-4">
            <ExportToolbar
              chartRef={chartContainerRef as React.RefObject<HTMLElement>}
              sessionData={sessionData}
            />
          </div>
        </div>
        
        <DataInputPanel />
      </div>
    </div>
  );
}
