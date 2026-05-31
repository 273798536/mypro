import React, { useState, useEffect, useCallback } from 'react';
import { Atom, AlertTriangle, Layers } from 'lucide-react';
import { useVectorFieldStore } from '../store/vectorFieldStore';
import { computeStreamline, presetVectorFields, VectorFieldFormula } from '../utils/vectorFieldEngine';
import { SeedPointStatus, Vector3 } from '../types';
import VectorFieldCanvas from '../components/VectorFieldCanvas';
import SeedPointPanel from '../components/SeedPointPanel';
import HistoryTimeline from '../components/HistoryTimeline';
import ExportPanel from '../components/ExportPanel';

const VectorFieldApp: React.FC = () => {
  const vectorFields = useVectorFieldStore((state) => state.vectorFields);
  const activeFieldId = useVectorFieldStore((state) => state.activeFieldId);
  const seedPoints = useVectorFieldStore((state) => state.seedPoints);
  const streamlines = useVectorFieldStore((state) => state.streamlines);
  const history = useVectorFieldStore((state) => state.history);
  const addVectorField = useVectorFieldStore((state) => state.addVectorField);
  const setActiveField = useVectorFieldStore((state) => state.setActiveField);
  const addSeedPoint = useVectorFieldStore((state) => state.addSeedPoint);
  const updateSeedPoint = useVectorFieldStore((state) => state.updateSeedPoint);
  const deleteSeedPoint = useVectorFieldStore((state) => state.deleteSeedPoint);
  const setStreamline = useVectorFieldStore((state) => state.setStreamline);
  const clearStreamlines = useVectorFieldStore((state) => state.clearStreamlines);

  const activeField = vectorFields.find((f) => f.id === activeFieldId) || null;
  const activeSeeds = seedPoints.filter((s) => s.fieldId === activeFieldId);

  const [computingIds, setComputingIds] = useState<Set<string>>(new Set());
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'seeds' | 'history' | 'export'>('seeds');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    if (vectorFields.length === 0) {
      presetVectorFields.forEach((preset) => {
        addVectorField({
          name: preset.name,
          formula: preset.formula,
          parameters: preset.formula.parameters,
        });
      });
    }
  }, []);

  useEffect(() => {
    if (activeFieldId && seedPoints.length === 0) {
      const sampleSeeds: { position: Vector3; status: SeedPointStatus; remark: string }[] = [
        { position: { x: 1, y: 1, z: 1 }, status: 'normal', remark: '初始种子点' },
        { position: { x: 2, y: 3, z: 0.5 }, status: 'missing_fields', remark: '缺字段：采样时间未记录' },
        { position: { x: 0.5, y: -1, z: 2 }, status: 'late_addition', remark: '晚补：5月28日课后补充' },
        { position: { x: -2, y: 2, z: 1 }, status: 'modified', remark: '备注改过：原坐标有误，已修正' },
      ];

      setTimeout(() => {
        sampleSeeds.forEach((seed, index) => {
          setTimeout(() => {
            addSeedPoint({
              fieldId: activeFieldId,
              position: seed.position,
              status: seed.status,
              remark: seed.remark,
            });
          }, index * 100);
        });
      }, 300);
    }
  }, [activeFieldId]);

  const handleComputeStreamline = useCallback(
    async (seedId: string) => {
      if (!activeField) return;

      const seed = seedPoints.find((s) => s.id === seedId);
      if (!seed) return;

      setComputingIds((prev) => new Set(prev).add(seedId));

      await new Promise((resolve) => setTimeout(resolve, 100));

      const formula: VectorFieldFormula = {
        x: activeField.formula.x,
        y: activeField.formula.y,
        z: activeField.formula.z,
        parameters: activeField.parameters,
      };

      const streamline = computeStreamline(formula, seed.position, seedId);
      setStreamline(seedId, streamline);

      setComputingIds((prev) => {
        const next = new Set(prev);
        next.delete(seedId);
        return next;
      });
    },
    [activeField, seedPoints, setStreamline]
  );

  const handleComputeAll = useCallback(() => {
    activeSeeds.forEach((seed) => {
      handleComputeStreamline(seed.id);
    });
  }, [activeSeeds, handleComputeStreamline]);

  const handleCaptureScreenshot = useCallback(() => {
    const takeScreenshot = (window as unknown as { takeVectorFieldScreenshot?: () => void }).takeVectorFieldScreenshot;
    if (takeScreenshot) {
      takeScreenshot();
    }
  }, []);

  const handleScreenshotData = useCallback((dataUrl: string) => {
    setScreenshot(dataUrl);
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      field: activeField,
      seeds: activeSeeds,
      streamlines: Array.from(streamlines.values()),
      screenshot,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vector-field-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeField, activeSeeds, streamlines, screenshot]);

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = presetVectorFields.find((p) => p.name === presetName);
    if (preset) {
      const existing = vectorFields.find((f) => f.name === presetName);
      if (existing) {
        setActiveField(existing.id);
        clearStreamlines();
      }
    }
  };

  const hasExplosion = Array.from(streamlines.values()).some((sl) => sl.hasExplosion);
  const hasDataGap = Array.from(streamlines.values()).some((sl) => sl.dataGapRegions.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Atom size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  数学向量场航线
                </h1>
                <p className="text-xs text-slate-400">采样爆炸检测与可视化系统</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700 mx-4" />

            <div className="flex items-center gap-2">
              <Layers size={16} className="text-slate-400" />
              <select
                value={selectedPreset || (activeField?.name ?? '')}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {vectorFields.map((field) => (
                  <option key={field.id} value={field.name}>
                    {field.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasExplosion && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border border-red-700 rounded-lg">
                <AlertTriangle size={14} className="text-red-400 animate-pulse" />
                <span className="text-xs text-red-300">检测到采样爆炸</span>
              </div>
            )}
            {hasDataGap && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-900/30 border border-orange-700 rounded-lg">
                <span className="w-2 h-2 bg-orange-400 rounded-full" />
                <span className="text-xs text-orange-300">存在数据缺口</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-80 flex-shrink-0 p-4 flex flex-col">
          <div className="flex gap-1 mb-4 p-1 bg-slate-800/50 rounded-lg">
            {[
              { key: 'seeds', label: '种子点' },
              { key: 'history', label: '历史记录' },
              { key: 'export', label: '导出详情' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === 'seeds' && (
              <SeedPointPanel
                seeds={activeSeeds}
                onAdd={(position, status, remark) => {
                  if (activeFieldId) {
                    addSeedPoint({ fieldId: activeFieldId, position, status, remark });
                  }
                }}
                onUpdate={(id, updates, remark) => updateSeedPoint(id, updates, remark)}
                onDelete={(id, remark) => deleteSeedPoint(id, remark)}
                onCompute={handleComputeStreamline}
                onComputeAll={handleComputeAll}
                computingIds={computingIds}
              />
            )}
            {activeTab === 'history' && <HistoryTimeline records={history} />}
            {activeTab === 'export' && (
              <ExportPanel
                field={activeField}
                seeds={activeSeeds}
                streamlines={Array.from(streamlines.values())}
                screenshot={screenshot}
                onCaptureScreenshot={handleCaptureScreenshot}
                onExport={handleExport}
              />
            )}
          </div>
        </div>

        <div className="flex-1 relative p-4 pr-4">
          <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
            <VectorFieldCanvas
              streamlines={Array.from(streamlines.values())}
              seedPoints={activeSeeds.map((s) => ({ id: s.id, position: s.position }))}
              onScreenshot={handleScreenshotData}
            />
          </div>

          {hasDataGap && (
            <div className="absolute top-6 right-6 max-w-xs">
              <div className="bg-orange-900/90 backdrop-blur-sm border border-orange-600 rounded-lg p-3 shadow-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-200">数据缺口警告</p>
                    <p className="text-xs text-orange-300 mt-1">
                      部分流线因数值不稳定、边界越界或方向反转提前终止。数据缺口区域未做虚假渲染，详见导出详情。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-6">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2">操作提示</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p>🖱️ 左键拖拽：旋转视角</p>
                <p>🖱️ 右键拖拽：平移视角</p>
                <p>🖱️ 滚轮：缩放视图</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VectorFieldApp;
