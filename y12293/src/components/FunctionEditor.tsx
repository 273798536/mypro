import { useState, useMemo } from 'react';
import { FunctionSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { validateExpression } from '@/utils/mathUtils';

const presetFunctions = [
  { label: 'y = x²', expr: 'x^2' },
  { label: 'y = sin(x)', expr: 'sin(x)' },
  { label: 'y = cos(x)', expr: 'cos(x)' },
  { label: 'y = √x', expr: 'sqrt(x)' },
  { label: 'y = e^x', expr: 'e^x' },
  { label: 'y = ln(x)', expr: 'log(x)' },
];

export function FunctionEditor() {
  const { currentFunction, setExpression, setDomain } = useAppStore();
  const [localExpression, setLocalExpression] = useState(currentFunction.expression);
  const [localStart, setLocalStart] = useState(currentFunction.domain.start.toString());
  const [localEnd, setLocalEnd] = useState(currentFunction.domain.end.toString());

  const isValid = useMemo(() => validateExpression(localExpression), [localExpression]);
  const isReversed = parseFloat(localStart) > parseFloat(localEnd);

  const handleExpressionBlur = () => {
    if (isValid) {
      setExpression(localExpression);
    }
  };

  const handlePresetClick = (expr: string) => {
    setLocalExpression(expr);
    setExpression(expr);
  };

  const handleDomainBlur = () => {
    const start = parseFloat(localStart);
    const end = parseFloat(localEnd);
    if (!isNaN(start) && !isNaN(end)) {
      setDomain(start, end);
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FunctionSquare className="w-5 h-5 text-primary-400" />
        <h3 className="font-semibold text-white">函数曲线</h3>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-400">函数表达式 f(x)</label>
        <div className="relative">
          <input
            type="text"
            value={localExpression}
            onChange={(e) => setLocalExpression(e.target.value)}
            onBlur={handleExpressionBlur}
            className={`w-full px-3 py-2 bg-dark-700 border rounded-lg font-mono text-sm text-white focus:outline-none focus:ring-2 transition-all ${
              isValid
                ? 'border-gray-600 focus:ring-primary-500/50 focus:border-primary-500'
                : 'border-warning-500 focus:ring-warning-500/50'
            }`}
            placeholder="例如: x^2, sin(x), etc."
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-warning-500" />
            )}
          </div>
        </div>
        {!isValid && (
          <p className="text-xs text-warning-400">表达式格式无效</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-400">预设函数</label>
        <div className="grid grid-cols-3 gap-2">
          {presetFunctions.map((preset) => (
            <button
              key={preset.expr}
              onClick={() => handlePresetClick(preset.expr)}
              className={`px-2 py-1.5 text-xs rounded transition-all ${
                localExpression === preset.expr
                  ? 'bg-primary-500 text-dark-900'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">区间起点 a</label>
          <input
            type="number"
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            onBlur={handleDomainBlur}
            className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
            step="0.1"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-400">区间终点 b</label>
          <input
            type="number"
            value={localEnd}
            onChange={(e) => setLocalEnd(e.target.value)}
            onBlur={handleDomainBlur}
            className={`w-full px-3 py-2 border rounded-lg text-sm text-white focus:outline-none focus:ring-2 transition-all ${
              isReversed
                ? 'bg-warning-900/30 border-warning-500 focus:ring-warning-500/50'
                : 'bg-dark-700 border-gray-600 focus:ring-primary-500/50 focus:border-primary-500'
            }`}
            step="0.1"
          />
        </div>
      </div>

      {isReversed && (
        <div className="flex items-center gap-2 p-2 bg-warning-500/20 border border-warning-500/50 rounded-lg warning-glow">
          <AlertTriangle className="w-4 h-4 text-warning-400 flex-shrink-0" />
          <span className="text-xs text-warning-300">
            区间反向：a ({localStart}) {'>'} b ({localEnd})
          </span>
        </div>
      )}
    </div>
  );
}
