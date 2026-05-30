import { useCallback, useMemo } from 'react';
import { History, Plus, Palette, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import type { ChangeRecord } from '@/types';
import { useDetectionStore } from '@/store/detectionStore';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { clsx } from '@/lib/utils';

interface ChangeItemProps {
  change: ChangeRecord;
  index: number;
  onApply?: () => void;
}

function ChangeItem({ change, index, onApply }: ChangeItemProps) {
  const isColorScaleChange = change.type === 'color_scale';

  const getIcon = () => {
    switch (change.type) {
      case 'formula':
        return Plus;
      case 'color_scale':
        return Palette;
      case 'viewpoint':
        return ArrowRight;
      default:
        return History;
    }
  };

  const getLabel = () => {
    switch (change.type) {
      case 'formula':
        return '公式变更';
      case 'color_scale':
        return '颜色标尺补录';
      case 'viewpoint':
        return '视角保存';
      default:
        return '变更';
    }
  };

  const Icon = getIcon();

  return (
    <div
      className={clsx(
        'p-3 rounded-lg border transition-all duration-200',
        'bg-slate-800/30 border-slate-700'
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            isColorScaleChange
              ? 'bg-cyan-500/20'
              : 'bg-slate-700/50'
          )}
        >
          <Icon
            size={14}
            className={isColorScaleChange ? 'text-cyan-400' : 'text-slate-400'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={clsx(
                'text-xs font-medium',
                isColorScaleChange ? 'text-cyan-400' : 'text-slate-300'
              )}
            >
              {getLabel()}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              #{index + 1}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-2 line-clamp-2">
            {change.description}
          </p>

          {change.affectedAnomalyIds && change.affectedAnomalyIds.length > 0 && (
            <div className="mb-2 p-2 bg-cyan-500/10 rounded border border-cyan-500/30">
              <div className="text-[10px] text-cyan-400 mb-1 flex items-center gap-1">
                <Palette size={10} />
                影响了 {change.affectedAnomalyIds.length} 条明细记录
              </div>
              <div className="flex flex-wrap gap-1">
                {change.affectedAnomalyIds.slice(0, 5).map((id) => (
                  <span
                    key={id}
                    className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono"
                  >
                    {id.slice(-8)}
                  </span>
                ))}
                {change.affectedAnomalyIds.length > 5 && (
                  <span className="text-[9px] text-cyan-500">
                    +{change.affectedAnomalyIds.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              {new Date(change.timestamp).toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              {change.anomaliesBefore !== undefined && (
                <div className="flex items-center gap-1 text-[10px]">
                  <XCircle size={10} className="text-red-400" />
                  <span className="text-slate-400">{change.anomaliesBefore}</span>
                  <ArrowRight size={10} className="text-slate-600" />
                  <CheckCircle size={10} className="text-emerald-400" />
                  <span className="text-slate-400">{change.anomaliesAfter}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChangeHistory() {
  const changeHistory = useDetectionStore((s) => s.changeHistory);
  const currentResult = useDetectionStore((s) => s.currentResult);
  const colorScale = useVectorFieldStore((s) => s.colorScale);
  const setColorScale = useVectorFieldStore((s) => s.setColorScale);

  const handleAddColorScale = useCallback(() => {
    const exampleScale = {
      min: 0,
      max: 5,
      colors: ['#22c55e', '#eab308', '#ef4444'],
      enabled: true,
    };
    setColorScale(exampleScale);
  }, [setColorScale]);

  const colorScaleRecords = useMemo(
    () => changeHistory.filter((c) => c.type === 'color_scale'),
    [changeHistory]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          变更历史
        </h3>
        <span className="text-[10px] text-slate-500">
          共 {changeHistory.length} 条
        </span>
      </div>

      {!colorScale && (
        <button
          onClick={handleAddColorScale}
          className={clsx(
            'w-full p-3 rounded-lg border-2 border-dashed',
            'border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10',
            'text-cyan-400 text-xs font-medium',
            'flex items-center justify-center gap-2 transition-colors'
          )}
        >
          <Palette size={14} />
          补录颜色标尺（第二次导入）
        </button>
      )}

      {colorScale && (
        <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Palette size={14} className="text-cyan-400" />
            <span className="text-xs font-medium text-cyan-400">
              颜色标尺已启用
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex mb-2">
            {colorScale.colors.map((c, i) => (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>{colorScale.min}</span>
            <span>{colorScale.max}</span>
          </div>
        </div>
      )}

      {changeHistory.length > 0 ? (
        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
          {changeHistory.map((change, index) => (
            <ChangeItem
              key={change.id}
              change={change}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <History size={24} className="text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">暂无变更记录</p>
          {currentResult && (
            <p className="text-[10px] text-slate-600 mt-1">
              补录颜色标尺后将记录变更
            </p>
          )}
        </div>
      )}

      {colorScaleRecords.length > 0 && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <h4 className="text-[11px] font-medium text-slate-300 mb-2">
            前后变化说明
          </h4>
          <div className="text-[10px] text-slate-400 space-y-1">
            <p>• <span className="text-cyan-400">第一次导入</span>：仅向量场公式和种子点，无颜色映射</p>
            <p>• <span className="text-emerald-400">第二次补录</span>：添加颜色标尺，流线颜色按速度映射</p>
            <p>• <span className="text-yellow-400">影响范围</span>：所有流线的视觉渲染样式</p>
            <p>• <span className="text-violet-400">异常不变</span>：检测逻辑和结果保持一致</p>
          </div>
        </div>
      )}
    </div>
  );
}
