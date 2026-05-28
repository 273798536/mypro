import React from 'react';
import { CalculationInput, AreaUnit, ForceUnit, LengthUnit, ValidationError } from '../../types';
import { AlertTriangle, RotateCcw, BookOpen } from 'lucide-react';

interface InputPanelProps {
  input: CalculationInput;
  errors: ValidationError[];
  onUpdate: (field: keyof CalculationInput, value: string | number) => void;
  onReset: () => void;
  onLoadExample: (index: number) => void;
}

const areaUnits: AreaUnit[] = ['mm²', 'cm²', 'm²'];
const forceUnits: ForceUnit[] = ['N', 'kN', 'kgf'];
const lengthUnits: LengthUnit[] = ['mm', 'cm', 'm'];

export const InputPanel: React.FC<InputPanelProps> = ({
  input,
  errors,
  onUpdate,
  onReset,
  onLoadExample,
}) => {
  const hasFieldError = (field: string) =>
    errors.some(e => e.field === field && e.severity === 'error');

  const hasFieldWarning = (field: string) =>
    errors.some(e => e.field === field && e.severity === 'warning');

  const getFieldErrors = (field: string) =>
    errors.filter(e => e.field === field);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm">
            ⚙
          </span>
          参数设置
        </h2>
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <RotateCcw size={16} />
          重置
        </button>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-700">快速示例</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['教材例题', '工程案例', '大型系统'].map((name, i) => (
            <button
              key={i}
              onClick={() => onLoadExample(i)}
              className="px-3 py-1.5 text-xs bg-white border border-blue-200 text-blue-600 rounded-md hover:bg-blue-100 transition-all"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">活塞参数</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                小活塞面积
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={input.smallPistonArea}
                  onChange={e => onUpdate('smallPistonArea', parseFloat(e.target.value) || 0)}
                  step="any"
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    hasFieldError('smallPistonArea')
                      ? 'border-red-400 bg-red-50'
                      : hasFieldWarning('smallPistonArea')
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-300'
                  }`}
                />
                <select
                  value={input.smallPistonAreaUnit}
                  onChange={e => onUpdate('smallPistonAreaUnit', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {areaUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                大活塞面积
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={input.largePistonArea}
                  onChange={e => onUpdate('largePistonArea', parseFloat(e.target.value) || 0)}
                  step="any"
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    hasFieldError('largePistonArea')
                      ? 'border-red-400 bg-red-50'
                      : hasFieldWarning('largePistonArea')
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-300'
                  }`}
                />
                <select
                  value={input.largePistonAreaUnit}
                  onChange={e => onUpdate('largePistonAreaUnit', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {areaUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">运动参数</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                输入力
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={input.inputForce}
                  onChange={e => onUpdate('inputForce', parseFloat(e.target.value) || 0)}
                  step="any"
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    hasFieldError('inputForce')
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                <select
                  value={input.inputForceUnit}
                  onChange={e => onUpdate('inputForceUnit', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {forceUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                输入行程
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={input.inputStroke}
                  onChange={e => onUpdate('inputStroke', parseFloat(e.target.value) || 0)}
                  step="any"
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${
                    hasFieldError('inputStroke')
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                <select
                  value={input.inputStrokeUnit}
                  onChange={e => onUpdate('inputStrokeUnit', e.target.value)}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {lengthUnits.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-orange-500">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">系统参数</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-600">
                  效率
                </label>
                <span className="text-sm font-mono text-blue-600">
                  {(input.efficiency * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={input.efficiency}
                onChange={e => onUpdate('efficiency', parseFloat(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                  hasFieldError('efficiency')
                    ? 'bg-red-200'
                    : hasFieldWarning('efficiency')
                    ? 'bg-yellow-200'
                    : 'bg-blue-200'
                }`}
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(input.efficiency - 0.1) * 111}%, #e5e7eb ${(input.efficiency - 0.1) * 111}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                材料来源（选填）
              </label>
              <input
                type="text"
                value={input.source}
                onChange={e => onUpdate('source', e.target.value)}
                placeholder="例如：教材P123例题、课堂练习、实验数据..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="space-y-2">
            {errors.map((error, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  error.severity === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{error.message}</p>
                  <p className="text-xs opacity-75 mt-0.5">{error.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
