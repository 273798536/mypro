import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  RotateCcw,
  Database,
  Droplets,
  Thermometer,
  Gauge,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCalculationStore } from '@/store/calculationStore';
import { PipeSegmentInput } from '@/components/PipeSegmentInput';
import { ValveControl } from '@/components/ValveControl';
import { BranchManager } from '@/components/BranchManager';
import { UnitValidationPanel } from '@/components/UnitValidationPanel';
import { TechInput, TechSelect } from '@/components/common/TechInput';
import { FLUID_NAMES } from '@/data/fluidProperties';
import type { FluidType, FlowUnit, PressureUnit } from '@/types';

export default function InputPage() {
  const navigate = useNavigate();
  const store = useCalculationStore();
  const { session, isCalculating } = store;

  const fluidTypes: { value: FluidType; label: string }[] = [
    { value: 'water', label: FLUID_NAMES.water },
    { value: 'steam', label: FLUID_NAMES.steam },
    { value: 'air', label: FLUID_NAMES.air },
    { value: 'refrigerant', label: FLUID_NAMES.refrigerant },
  ];

  const flowUnits: { value: FlowUnit; label: string }[] = [
    { value: 'm³/h', label: 'm³/h' },
    { value: 'L/s', label: 'L/s' },
    { value: 'm³/s', label: 'm³/s' },
    { value: 'gpm', label: 'gpm' },
  ];

  const pressureUnits: { value: PressureUnit; label: string }[] = [
    { value: 'kPa', label: 'kPa' },
    { value: 'Pa', label: 'Pa' },
    { value: 'bar', label: 'bar' },
    { value: 'psi', label: 'psi' },
    { value: 'mH2O', label: 'mH2O' },
  ];

  const handleCalculate = () => {
    store.performCalculation();
    setTimeout(() => {
      navigate('/result');
    }, 600);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="tech-card p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-industrial-text">{session.title}</h2>
            <p className="text-xs text-industrial-textMuted mt-1">
              创建于 {new Date(session.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={store.loadDemoData}
              className="tech-button-secondary text-sm flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              加载示例
            </button>
            <button
              onClick={store.resetCalculation}
              className="tech-button-danger text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>
        </div>

        <div className="mb-4">
          <TechInput
            label="计算标题"
            value={session.title}
            onChange={(e) => store.setSessionTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TechSelect
            label="流体类型"
            value={session.fluid.type}
            onChange={(e) => store.setFluidType(e.target.value as FluidType)}
            options={fluidTypes}
            prefix={<Droplets className="w-4 h-4" />}
          />

          <TechInput
            label="流体温度"
            type="number"
            value={session.fluid.temperature}
            onChange={(e) => store.setTemperature(Number(e.target.value))}
            unit="°C"
            prefix={<Thermometer className="w-4 h-4" />}
          />

          <TechInput
            label="总流量"
            type="number"
            value={session.totalFlowRate}
            onChange={(e) => store.setTotalFlowRate(Number(e.target.value))}
            unit={session.flowRateUnit}
            unitOptions={flowUnits.map(u => u.value)}
            onUnitChange={(u) => store.setFlowRateUnit(u as FlowUnit)}
            prefix={<Gauge className="w-4 h-4" />}
          />

          <TechSelect
            label="压降单位"
            value={store.selectedPressureUnit}
            onChange={(e) => store.setPressureUnit(e.target.value as PressureUnit)}
            options={pressureUnits}
          />
        </div>

        {session.fluid && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-industrial-textMuted">
            <div className="p-2 bg-primary-900/30 rounded">
              密度 ρ = <span className="font-mono text-industrial-text">{session.fluid.density.toFixed(2)}</span> kg/m³
            </div>
            <div className="p-2 bg-primary-900/30 rounded">
              运动粘度 ν = <span className="font-mono text-industrial-text">{session.fluid.viscosity.toExponential(4)}</span> Pa·s
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-industrial-text">主管路段</h3>
              <button
                onClick={store.addMainSegment}
                className="tech-button text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加管段
              </button>
            </div>
            <div className="space-y-3">
              {session.mainSegments.map((segment, index) => (
                <PipeSegmentInput
                  key={segment.id}
                  segment={segment}
                  index={index}
                  onChange={(updates) => store.updateMainSegment(segment.id, updates)}
                  onRemove={() => store.removeMainSegment(segment.id)}
                  canRemove={session.mainSegments.length > 1}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ValveControl
              valve={session.mainValve}
              onChange={store.setMainValve}
              title="主阀门控制"
              showEvidence={true}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <BranchManager />
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <UnitValidationPanel showLive={true} />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="sticky bottom-4 z-20"
      >
        <div className="tech-card p-4 flex items-center justify-between">
          <div className="text-sm text-industrial-textMuted">
            {session.mainSegments.length} 段主管 | {session.branches.length} 条支路 | {session.flowRateUnit}
          </div>
          <button
            onClick={handleCalculate}
            disabled={isCalculating}
            className="tech-button-success flex items-center gap-2 px-8 py-3 text-lg"
          >
            {isCalculating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Play className="w-5 h-5" />
                </motion.div>
                计算中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                开始计算
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
