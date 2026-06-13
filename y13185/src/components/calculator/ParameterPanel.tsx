import { useState } from 'react';
import { Settings, RotateCcw, Layers, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CalculationParameters, CalculationOutput } from '@/types/experiment';
import { PARAMETER_RANGES, PARAMETER_LABELS, PARAMETER_LEVELS, LEVEL_LABELS, DEFAULT_PARAMETERS } from '@/constants/parameters';

interface ParameterPanelProps {
  parameters: CalculationParameters;
  previewResult?: CalculationOutput;
  currentResult?: CalculationOutput;
  onParameterChange: <K extends keyof CalculationParameters>(key: K, value: CalculationParameters[K]) => void;
  onUpdateParameter?: <K extends keyof CalculationParameters>(key: K, value: CalculationParameters[K]) => void;
  onGearShift: (direction: 'up' | 'down') => void;
  onReset?: () => void;
  gearLevel: number | string;
  isCalculating: boolean;
  disabled?: boolean;
  boundaryAnalysis?: any;
  sensitivityReport?: any;
}

export const ParameterPanel = ({
  parameters,
  previewResult,
  currentResult,
  onParameterChange,
  onUpdateParameter,
  onGearShift,
  onReset,
  gearLevel,
  isCalculating,
  disabled,
  boundaryAnalysis,
  sensitivityReport,
}: ParameterPanelProps) => {
  const handleParameterChange = <K extends keyof CalculationParameters>(key: K, value: CalculationParameters[K]) => {
    if (onUpdateParameter) {
      onUpdateParameter(key, value);
    }
    onParameterChange(key, value);
  };
  const [activeLevel, setActiveLevel] = useState<'level1' | 'level2' | 'level3' | 'custom'>(parameters.parameterLevel);
  
  const handleLevelClick = (level: 'level1' | 'level2' | 'level3') => {
    setActiveLevel(level);
    const levelData = PARAMETER_LEVELS[level];
    Object.entries(levelData).forEach(([key, value]) => {
      handleParameterChange(key as keyof CalculationParameters, value as any);
    });
  };

  const displayResult = currentResult || previewResult;
  
  const paramKeys = ['airDensity', 'windSpeed', 'angleOfAttack', 'smokeLineDiameter', 'turbulenceIntensity'] as const;
  
  return (
    <Card
      title="计算参数调节"
      subtitle="调整参数档位或手动设置，实时预览计算结果"
      icon={<Settings className="w-5 h-5" />}
      headerRight={
        <div className="flex items-center gap-2">
          <StatusBadge status="info" size="sm">
            档位 {gearLevel}
          </StatusBadge>
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          )}
        </div>
      }
    >
      {disabled && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">存在方向符号异常</p>
            <p className="mt-0.5">
              检测到数据中存在方向符号异常，需要项目经理确认后才能执行复算。
              请先前往「异常处理」页面处理。
            </p>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <Layers className="w-4 h-4" />
          快速档位调节
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGearShift('down')}
            disabled={disabled}
          >
            - 降档
          </Button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-bold text-[#0F3460]">
              档位 {gearLevel}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGearShift('up')}
            disabled={disabled}
          >
            + 升档
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <Layers className="w-4 h-4" />
          参数档位快速选择
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['level1', 'level2', 'level3'] as const).map(level => {
            const isActive = activeLevel === level;
            const levelData = PARAMETER_LEVELS[level];
            
            return (
              <motion.button
                key={level}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLevelClick(level)}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  isActive
                    ? 'border-[#0F3460] bg-[#0F3460]/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge
                    status={isActive ? 'success' : 'info'}
                    size="sm"
                    showIcon={false}
                  >
                    {LEVEL_LABELS[level]}
                  </StatusBadge>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p>风速: {levelData.windSpeed} m/s</p>
                  <p>攻角: {levelData.angleOfAttack}°</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Settings className="w-4 h-4" />
            手动参数调节
          </label>
          {parameters.parameterLevel === 'custom' && (
            <StatusBadge status="warning" size="sm">自定义模式</StatusBadge>
          )}
        </div>
        
        <div className="space-y-4">
          {paramKeys.map(key => {
            const range = PARAMETER_RANGES[key];
            const label = PARAMETER_LABELS[key];
            const value = parameters[key];
            const percent = ((value - range.min) / (range.max - range.min)) * 100;
            
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={value}
                      step={range.step}
                      min={range.min}
                      max={range.max}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num) && num >= range.min && num <= range.max) {
                          handleParameterChange(key, num);
                          setActiveLevel('custom');
                        }
                      }}
                      className="w-24 px-2 py-1 text-right border border-gray-300 rounded focus:ring-2 focus:ring-[#0F3460]/50 focus:border-[#0F3460] outline-none text-sm"
                    />
                    <span className="text-sm text-gray-500 w-12">{range.unit}</span>
                  </div>
                </div>
                
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#0F3460] to-[#16C79A] rounded-full transition-all duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                
                <input
                  type="range"
                  value={value}
                  step={range.step}
                  min={range.min}
                  max={range.max}
                  onChange={(e) => {
                  handleParameterChange(key, parseFloat(e.target.value));
                  setActiveLevel('custom');
                }}
                  className="w-full h-2 opacity-0 absolute cursor-pointer"
                />
                
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{range.min}</span>
                  <span>{range.max}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {displayResult && (
        <div className="p-4 bg-gradient-to-br from-[#0F3460]/5 to-[#16C79A]/5 rounded-xl mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#0F3460]" />
            <span className="text-sm font-medium text-gray-700">实时预览结果</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">升力系数 C_L</p>
              <p className="text-xl font-bold font-mono text-[#0F3460]">
                {displayResult.liftCoefficient?.toFixed(4) || '-'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">阻力系数 C_D</p>
              <p className="text-xl font-bold font-mono text-[#533483]">
                {displayResult.dragCoefficient?.toFixed(4) || '-'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">雷诺数 Re</p>
              <p className="text-lg font-bold font-mono text-gray-700">
                {displayResult.reynoldsNumber?.toLocaleString() || '-'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500">有效流速</p>
              <p className="text-lg font-bold font-mono text-gray-700">
                {displayResult.flowVelocity?.toFixed(2) || '-'} <span className="text-sm font-normal">m/s</span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {sensitivityReport && (
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          <p className="text-xs text-gray-500 mb-2">参数敏感性分析</p>
          <div className="space-y-1">
            {Object.entries(sensitivityReport).map(([key, value]: [string, any]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{PARAMETER_LABELS[key as keyof typeof PARAMETER_LABELS] || key}</span>
                <span className="font-mono font-medium text-[#0F3460]">
                  影响度: {((value as number) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
