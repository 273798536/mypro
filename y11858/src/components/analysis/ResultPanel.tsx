import { useAppStore } from '../../store/useAppStore';
import { generateColorMapTexture } from '../../utils/colormaps';
import { useEffect, useRef } from 'react';
import type { ColorMapName, ResultClassification } from '../../types';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

const CLASSIFICATION_CONFIG: Record<ResultClassification, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle;
  description: string;
}> = {
  'ready': {
    label: '可直接用',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
    icon: CheckCircle,
    description: '归一化检查通过，色阶无误导风险，可直接用于教学',
  },
  'needs-review': {
    label: '需科普老师确认',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
    icon: AlertTriangle,
    description: '存在需要科普老师确认的项目（归一化偏差、色阶警告、切片越界等）',
  },
  'misleading': {
    label: '色阶误导',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/30',
    icon: XCircle,
    description: '色阶存在严重误导，可能导致学生对概率密度分布产生错误理解',
  },
};

export function ResultPanel() {
  const currentResult = useAppStore((s) => s.currentResult);
  const comparisonChanges = useAppStore((s) => s.comparisonChanges);

  if (!currentResult) {
    return (
      <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
        <div className="flex items-center gap-2 text-slate-500">
          <Info className="w-4 h-4" />
          <span className="text-xs">点击"开始计算"查看分析结果</span>
        </div>
      </div>
    );
  }

  const config = CLASSIFICATION_CONFIG[currentResult.classification];
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <div className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{config.description}</p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide">检查结果</h4>

        <CheckItem
          label="归一化检查"
          passed={currentResult.normalizationCheck.passed}
          detail={`积分值 = ${currentResult.normalizationCheck.integralValue.toFixed(4)}`}
        />

        <CheckItem
          label="色阶检查"
          passed={currentResult.colorScaleCheck.passed}
          detail={currentResult.colorScaleCheck.issues.length > 0
            ? currentResult.colorScaleCheck.issues.map(i => i.message).join('；')
            : '色阶正常'
          }
        />

        <CheckItem
          label="切片越界检查"
          passed={currentResult.sliceBoundsCheck.passed}
          detail={currentResult.sliceBoundsCheck.violations.length > 0
            ? currentResult.sliceBoundsCheck.violations.map(v =>
                `${v.axis.toUpperCase()}轴: ${v.requestedValue.toFixed(1)} → ${v.correctedValue.toFixed(1)}`
              ).join('；')
            : '无越界'
          }
        />
      </div>

      {currentResult.warnings.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide">警告信息</h4>
          {currentResult.warnings.map((warning, i) => (
            <div key={i} className="text-xs text-amber-400/80 bg-amber-400/5 px-2 py-1 rounded border border-amber-400/10">
              {warning}
            </div>
          ))}
        </div>
      )}

      {comparisonChanges && comparisonChanges.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            与上次运行变更
          </h4>
          {comparisonChanges.map((change, i) => (
            <div key={i} className="text-xs bg-cyan-400/5 px-2 py-1.5 rounded border border-cyan-400/10">
              <span className="text-slate-400">{change.label}:</span>{' '}
              <span className="text-red-400/70 line-through font-mono">{String(change.oldValue)}</span>
              {' → '}
              <span className="text-green-400/80 font-mono">{String(change.newValue)}</span>
            </div>
          ))}
        </div>
      )}

      {comparisonChanges && comparisonChanges.length === 0 && (
        <div className="text-xs text-slate-600">参数未发生变化</div>
      )}
    </div>
  );
}

function CheckItem({ label, passed, detail }: { label: string; passed: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
        passed ? 'bg-green-400/20' : 'bg-red-400/20'
      }`}>
        {passed ? (
          <CheckCircle className="w-3 h-3 text-green-400" />
        ) : (
          <XCircle className="w-3 h-3 text-red-400" />
        )}
      </div>
      <div>
        <div className={`text-xs font-medium ${passed ? 'text-slate-300' : 'text-red-300'}`}>
          {label}
        </div>
        <div className="text-[10px] text-slate-500">{detail}</div>
      </div>
    </div>
  );
}
