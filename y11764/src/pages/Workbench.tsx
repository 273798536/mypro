import React, { useState, useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useFilterStore } from '../store/useFilterStore';
import { Scene3D } from '../components/three/Scene3D';
import { ControlPanel } from '../components/panels/ControlPanel';
import { DetailPanel } from '../components/panels/DetailPanel';
import { BottomBar } from '../components/panels/BottomBar';
import type { Portfolio } from '../types/portfolio';
import { validatePortfolioWeights, detectRiskOverlap, detectInactiveConstraints } from '../engine/validation';
import { filterPortfolios } from '../engine/constraints';

export const Workbench: React.FC = () => {
  const { portfolios, constraints } = useDataStore();
  const {
    returnMin, returnMax,
    volatilityMin, volatilityMax,
    drawdownMin, drawdownMax,
    sharpeMin,
    showAnomalies, showOnlyFeasible,
    sceneSettings
  } = useFilterStore();

  const filterSettings = {
    returnMin, returnMax,
    volatilityMin, volatilityMax,
    drawdownMin, drawdownMax,
    sharpeMin,
    showAnomalies, showOnlyFeasible,
    selectedCategories: []
  };

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [hoveredPortfolioId, setHoveredPortfolioId] = useState<string | null>(null);

  const selectedPortfolio = useMemo(
    () => portfolios.find(p => p.id === selectedPortfolioId) || null,
    [portfolios, selectedPortfolioId]
  );

  const hoveredPortfolio = useMemo(
    () => portfolios.find(p => p.id === hoveredPortfolioId) || null,
    [portfolios, hoveredPortfolioId]
  );

  const portfoliosWithValidation = useMemo(() => {
    return portfolios.map(p => {
      const validation = validatePortfolioWeights(p.weights);
      const anomalies = [...p.anomalies];
      let status: 'normal' | 'warning' | 'error' = p.status;

      if (validation.anomaly) {
        const existingIdx = anomalies.findIndex(a => a.type === 'weight_sum');
        if (existingIdx >= 0) {
          anomalies[existingIdx] = validation.anomaly;
        } else {
          anomalies.push(validation.anomaly);
        }
        if (validation.anomaly.severity === 'error') {
          status = 'error';
        } else if (status === 'normal') {
          status = 'warning';
        }
      } else {
        const idx = anomalies.findIndex(a => a.type === 'weight_sum');
        if (idx >= 0) anomalies.splice(idx, 1);
        if (anomalies.length === 0) status = 'normal';
      }

      return { ...p, anomalies, status };
    });
  }, [portfolios]);

  const filteredPortfolios = useMemo(() => {
    return filterPortfolios(portfoliosWithValidation, constraints, filterSettings);
  }, [portfoliosWithValidation, constraints, filterSettings]);

  const handlePortfolioClick = (portfolio: Portfolio | null) => {
    setSelectedPortfolioId(portfolio?.id || null);
  };

  const handlePortfolioHover = (portfolioId: string | null) => {
    setHoveredPortfolioId(portfolioId);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />

        <div className="flex-1 relative">
          <Scene3D
            portfolios={filteredPortfolios}
            efficientFrontier={null}
            selectedPortfolioId={selectedPortfolioId}
            hoveredPortfolioId={hoveredPortfolioId}
            onPortfolioClick={handlePortfolioClick}
            onPortfolioHover={handlePortfolioHover}
            showSurface={sceneSettings.showSurface}
            showPoints={sceneSettings.showPoints}
            showAxes={sceneSettings.showAxis}
            highlightOptimal={sceneSettings.highlightOptimal}
          />

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
            <div className="pointer-events-auto">
              <h1 className="text-2xl font-bold text-slate-100 mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                投资组合有效前沿 · 3D 交互分析
              </h1>
              <p className="text-xs text-slate-500">
                {filteredPortfolios.length} 个组合符合筛选条件 · 拖拽旋转 · 滚轮缩放 · 点击查看详情
              </p>
            </div>
            <div className="pointer-events-auto flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-400">实时计算</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-20 left-4 pointer-events-none">
            <div className="p-3 rounded-lg bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-2">坐标轴说明</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-amber-400" />
                  <span className="text-slate-400">X轴 · 波动率</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-green-400" />
                  <span className="text-slate-400">Y轴 · 预期收益</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-red-400" />
                  <span className="text-slate-400">Z轴 · 最大回撤</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DetailPanel
          portfolio={selectedPortfolio}
          hoveredPortfolio={hoveredPortfolio}
        />
      </div>

      <BottomBar selectedPortfolio={selectedPortfolio} />
    </div>
  );
};
