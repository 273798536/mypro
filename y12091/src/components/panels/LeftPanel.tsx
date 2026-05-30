import { useState } from 'react';
import {
  Waves,
  Droplets,
  Mountain,
  Settings,
  ChevronDown,
  ChevronRight,
  Layers,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from '../controls/ParameterSlider';
import { DataQualityPanel } from './DataQualityPanel';
import { COLORS } from '../../types';
import { formatVolume } from '../../data/mockData';

export function LeftPanel() {
  const {
    params,
    setParams,
    sections,
    selectedSectionId,
    selectSection,
    calculationResult,
    savePlan,
    validateData,
    recalculate,
  } = useAppStore();

  const [expandedSections, setExpandedSections] = useState({
    params: true,
    sections: true,
    dataQuality: true,
  });

  const [planName, setPlanName] = useState(`方案_${new Date().toLocaleDateString('zh-CN')}`);

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePlan = () => {
    if (planName.trim()) {
      savePlan(planName.trim());
      setPlanName(`方案_${new Date().toLocaleDateString('zh-CN')}_${Date.now().toString().slice(-4)}`);
    }
  };

  const handleResetParams = () => {
    setParams({
      flowMultiplier: 1.0,
      sedimentMultiplier: 1.0,
      erosionCoefficient: 0.05,
      depositionCoefficient: 0.03,
      timeStep: 1,
    });
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  return (
    <div className="w-80 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers size={20} className="text-sky-400" />
          河道泥沙冲淤模型
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          调整参数，拖动时间轴，实时查看冲淤变化
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => toggleSection('params')}
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings size={16} className="text-sky-400" />
              计算参数
            </h3>
            {expandedSections.params ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronRight size={16} className="text-slate-400" />
            )}
          </div>

          {expandedSections.params && (
            <>
              <ParameterSlider
                label="流量系数"
                value={params.flowMultiplier}
                min={0.5}
                max={2.0}
                step={0.01}
                onChange={(v) => setParams({ flowMultiplier: v })}
                unit="x"
                description="放大或缩小所有断面的流量值"
                icon={<Waves size={14} />}
                color={COLORS.primary}
              />

              <ParameterSlider
                label="含沙量系数"
                value={params.sedimentMultiplier}
                min={0.5}
                max={2.0}
                step={0.01}
                onChange={(v) => setParams({ sedimentMultiplier: v })}
                unit="x"
                description="放大或缩小所有断面的含沙量值"
                icon={<Droplets size={14} />}
                color="#F97316"
              />

              <ParameterSlider
                label="冲刷系数"
                value={params.erosionCoefficient}
                min={0.01}
                max={0.2}
                step={0.001}
                onChange={(v) => setParams({ erosionCoefficient: v })}
                description="控制河床冲刷的敏感程度"
                icon={<Mountain size={14} />}
                color={COLORS.erosion}
              />

              <ParameterSlider
                label="淤积系数"
                value={params.depositionCoefficient}
                min={0.01}
                max={0.15}
                step={0.001}
                onChange={(v) => setParams({ depositionCoefficient: v })}
                description="控制泥沙淤积的敏感程度"
                icon={<Mountain size={14} />}
                color={COLORS.deposition}
              />

              <ParameterSlider
                label="时间步长"
                value={params.timeStep}
                min={0.5}
                max={6}
                step={0.5}
                onChange={(v) => setParams({ timeStep: v })}
                unit="小时"
                description="冲淤计算的时间间隔"
                icon={<Settings size={14} />}
                color="#8B5CF6"
              />

              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
                <button
                  onClick={handleResetParams}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 text-slate-300 text-sm rounded hover:bg-slate-600 transition-colors"
                >
                  <RotateCcw size={14} />
                  重置参数
                </button>
                <button
                  onClick={recalculate}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-500 text-white text-sm rounded hover:bg-sky-600 transition-colors"
                >
                  <RotateCcw size={14} />
                  重新计算
                </button>
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
          <div
            className="flex items-center justify-between cursor-pointer mb-3"
            onClick={() => toggleSection('sections')}
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers size={16} className="text-amber-400" />
              断面列表
            </h3>
            {expandedSections.sections ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronRight size={16} className="text-slate-400" />
            )}
          </div>

          {expandedSections.sections && (
            <div className="space-y-1">
              {[...sections].sort((a, b) => a.chainage - b.chainage).map((section) => {
                const isSelected = section.id === selectedSectionId;
                const bedChange = calculationResult?.bedChanges[section.id] || [];
                const totalChange = bedChange.reduce((a, b) => a + b, 0);
                const changeColor = totalChange > 0.01 ? 'text-red-400' : totalChange < -0.01 ? 'text-green-400' : 'text-slate-400';

                return (
                  <div
                    key={section.id}
                    onClick={() => selectSection(section.id)}
                    className={`p-2 rounded cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border border-sky-500/50'
                        : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-sm font-medium ${isSelected ? 'text-sky-400' : 'text-slate-200'}`}>
                          {section.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          桩号 {section.chainage}m
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-mono ${changeColor}`}>
                          {totalChange > 0.01 ? `+${totalChange.toFixed(3)}m` :
                           totalChange < -0.01 ? `${totalChange.toFixed(3)}m` : '0.000m'}
                        </div>
                        {section.notes && (
                          <div className="text-[10px] text-amber-400">有备注</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedSection && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              {selectedSection.name} 详情
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">桩号</span>
                <span className="text-white font-mono">{selectedSection.chainage}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">基础高程</span>
                <span className="text-white font-mono">{selectedSection.elevation.toFixed(2)}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">坐标点数</span>
                <span className="text-white font-mono">{selectedSection.coordinates.length}</span>
              </div>
              {calculationResult && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">累计冲刷</span>
                    <span className="text-red-400 font-mono">
                      {formatVolume(calculationResult.erosionVolume / sections.length)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">累计淤积</span>
                    <span className="text-green-400 font-mono">
                      {formatVolume(calculationResult.depositionVolume / sections.length)}
                    </span>
                  </div>
                </>
              )}
              {selectedSection.notes && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <span className="text-slate-400 text-xs">备注</span>
                  <p className="text-amber-300 text-xs mt-1">{selectedSection.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {expandedSections.dataQuality && <DataQualityPanel />}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="方案名称"
            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleSavePlan}
            className="px-4 py-2 bg-emerald-500 text-white text-sm rounded hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
          >
            <Save size={14} />
            保存
          </button>
        </div>
        <p className="text-xs text-slate-500">
          保存当前参数和计算结果，用于后续方案对比
        </p>
      </div>
    </div>
  );
}
