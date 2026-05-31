import { useState, useEffect } from 'react';
import { Play, RefreshCw, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { PRESET_FORMULAS } from '../types';
import 'katex/dist/katex.min.css';

export default function FormulaEditor() {
  const currentFormula = useWorkspaceStore((state) => state.currentFormula);
  const updateFormulaExpression = useWorkspaceStore((state) => state.updateFormulaExpression);
  const loadPreset = useWorkspaceStore((state) => state.loadPreset);
  const isFormulaValid = useWorkspaceStore((state) => state.isFormulaValid);
  const formulaError = useWorkspaceStore((state) => state.formulaError);
  const setFormulaValidity = useWorkspaceStore((state) => state.setFormulaValidity);
  const addDiagnosticIssue = useWorkspaceStore((state) => state.addDiagnosticIssue);
  const clearDiagnosticIssues = useWorkspaceStore((state) => state.clearDiagnosticIssues);

  const [expression, setExpression] = useState(currentFormula?.expression || '');
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (currentFormula) {
      setExpression(currentFormula.expression);
    }
  }, [currentFormula?.id]);

  const validateFormula = () => {
    clearDiagnosticIssues();
    
    try {
      const params = new Set(['x', 'y', 'z']);
      currentFormula?.parameters.forEach((p) => params.add(p.name));
      
      const functionBody = expression
        .replace(/\^/g, '**')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/abs/g, 'Math.abs')
        .replace(/max/g, 'Math.max')
        .replace(/min/g, 'Math.min')
        .replace(/log/g, 'Math.log')
        .replace(/exp/g, 'Math.exp');
      
      new Function('x', 'y', 'z', ...params, `return ${functionBody}`);
      
      setFormulaValidity(true, null);
      
      if (expression.includes('/0') || expression.includes('/ 0')) {
        addDiagnosticIssue({
          type: 'singularity_misleading',
          severity: 'warning',
          description: '公式中可能存在除以零的情况',
          suggestion: '检查分母是否可能为零，考虑添加条件判断或使用安全除法',
          triggeredBy: expression,
        });
      }
      
      if (expression.includes('sqrt') || expression.includes('log')) {
        addDiagnosticIssue({
          type: 'parameter_explosion',
          severity: 'warning',
          description: '公式包含可能导致参数爆炸的函数',
          suggestion: '确保sqrt或log的参数始终在有效范围内',
          triggeredBy: expression,
        });
      }
    } catch (e) {
      setFormulaValidity(false, e instanceof Error ? e.message : '语法错误');
      addDiagnosticIssue({
        type: 'parameter_explosion',
        severity: 'error',
        description: '公式语法错误',
        suggestion: '检查括号匹配、运算符和函数名是否正确',
        triggeredBy: expression,
      });
    }
  };

  const handleApply = () => {
    updateFormulaExpression(expression);
    validateFormula();
  };

  const handlePresetSelect = (index: number) => {
    loadPreset(index);
    setShowPresets(false);
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          隐函数公式
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="预设公式"
          >
            <BookOpen size={16} />
          </button>
          <button
            onClick={validateFormula}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="验证公式"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {showPresets && (
        <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-600">
          <p className="text-xs text-slate-400 mb-2">选择预设公式：</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_FORMULAS.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetSelect(index)}
                className="text-left px-2 py-1.5 text-xs rounded bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <textarea
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          onBlur={handleApply}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleApply();
            }
          }}
          className="w-full h-24 bg-slate-900 text-slate-100 font-mono text-sm p-3 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
          placeholder="输入隐函数表达式，例如：x^2 + y^2 + z^2 - r^2"
          spellCheck={false}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {isFormulaValid ? (
            <CheckCircle size={16} className="text-emerald-400" />
          ) : (
            <AlertCircle size={16} className="text-red-400" />
          )}
          <button
            onClick={handleApply}
            className="flex items-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded transition-colors"
          >
            <Play size={12} />
            应用
          </button>
        </div>
      </div>

      {formulaError && (
        <div className="mt-2 p-2 bg-red-900/30 border border-red-700 rounded">
          <p className="text-xs text-red-300 font-mono">{formulaError}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          <span className="text-slate-400">提示：</span> 使用 x, y, z 作为变量，支持 +, -, *, /, ^, sqrt, sin, cos, tan, abs, max, min, log, exp 等运算
        </p>
      </div>
    </div>
  );
}
