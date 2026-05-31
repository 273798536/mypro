import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  History,
  User,
  Signature,
  Link,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { useStabilityStore } from '@/store/useStabilityStore';
import { useVersionStore } from '@/store/useVersionStore';
import { useShipStore } from '@/store/useShipStore';
import { useCargoStore } from '@/store/useCargoStore';
import { formatConclusion } from '@/utils/stabilityCalculator';
import { DataLabel } from '@/components/common/DataLabel';
import { WeatherEvidence } from './WeatherEvidence';
import type { ManualCheckRecord } from '@/types';

export const DetailPanel: React.FC = () => {
  const result = useStabilityStore((state) => state.result);
  const { manualChecks, addManualCheck, getCurrentBallast } = useVersionStore();
  const { currentShip, shipRemark } = useShipStore();
  const { grid } = useCargoStore();
  const [weatherExpanded, setWeatherExpanded] = useState(true);
  const [checkMode, setCheckMode] = useState<'gravityOffset' | 'overload' | 'consistency' | null>(null);
  const [checkRemark, setCheckRemark] = useState('');
  const [checkerName, setCheckerName] = useState('');

  const currentBallast = getCurrentBallast();

  if (!result) {
    return (
      <div className="h-full flex flex-col bg-slate-900/95 border-l border-slate-700 p-4">
        <div className="text-center text-slate-500 mt-20">
          <Calculator size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">点击"计算稳性"按钮生成计算结果</p>
        </div>
      </div>
    );
  }

  const modelConclusion = formatConclusion(result.modelConclusion);
  const gridConclusion = formatConclusion(result.gridConclusion);

  const relevantChecks = manualChecks.filter(
    (c) => c.stabilityResultId === result.id
  );

  const handleManualCheck = (checkItem: ManualCheckRecord['checkItem']) => {
    if (!checkRemark || !checkerName) return;

    let originalValue: any;
    if (checkItem === 'gravityOffset') {
      originalValue = result.gravityOffset;
    } else if (checkItem === 'overload') {
      originalValue = { overloadCells: result.overloadCells };
    } else if (checkItem === 'consistency') {
      originalValue = {
        modelConclusion: result.modelConclusion,
        gridConclusion: result.gridConclusion,
        isConsistent: result.isConsistent,
      };
    }

    const newCheck: Omit<ManualCheckRecord, 'id' | 'createdAt'> = {
      stabilityResultId: result.id,
      checker: checkerName,
      checkItem,
      checkResult: 'confirmed',
      originalValue,
      remark: checkRemark,
      signature: `${checkerName.toUpperCase().replace(/\s/g, '_')}_${Date.now()}`,
    };

    addManualCheck(newCheck);
    useStabilityStore.getState().addManualCheckToResult(newCheck.id);
    setCheckMode(null);
    setCheckRemark('');
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/95 border-l border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-slate-100 mb-1">稳性计算详情</h2>
        <div className="text-xs text-slate-500 font-mono">
          计算ID: {result.id}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border-2 ${
            result.modelConclusion === 'safe' ? 'border-emerald-600 bg-emerald-950/30' :
            result.modelConclusion === 'warning' ? 'border-amber-600 bg-amber-950/30' :
            'border-red-600 bg-red-950/30'
          }`}>
            <div className="text-xs text-slate-400 mb-1">船舶模型结论</div>
            <div className="flex items-center gap-2">
              {result.modelConclusion === 'safe' && <CheckCircle size={20} className="text-emerald-400" />}
              {result.modelConclusion === 'warning' && <AlertTriangle size={20} className="text-amber-400" />}
              {result.modelConclusion === 'danger' && <XCircle size={20} className="text-red-400" />}
              <span className="text-xl font-bold" style={{ color: modelConclusion.color }}>
                {modelConclusion.text}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              模型ID: {result.shipModelId}
            </div>
          </div>

          <div className={`p-3 rounded-lg border-2 ${
            result.gridConclusion === 'safe' ? 'border-emerald-600 bg-emerald-950/30' :
            result.gridConclusion === 'warning' ? 'border-amber-600 bg-amber-950/30' :
            'border-red-600 bg-red-950/30'
          }`}>
            <div className="text-xs text-slate-400 mb-1">货舱格结论</div>
            <div className="flex items-center gap-2">
              {result.gridConclusion === 'safe' && <CheckCircle size={20} className="text-emerald-400" />}
              {result.gridConclusion === 'warning' && <AlertTriangle size={20} className="text-amber-400" />}
              {result.gridConclusion === 'danger' && <XCircle size={20} className="text-red-400" />}
              <span className="text-xl font-bold" style={{ color: gridConclusion.color }}>
                {gridConclusion.text}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              货舱ID: {result.cargoGridId}
            </div>
          </div>
        </div>

        {!result.isConsistent && (
          <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
              <AlertTriangle size={16} />
              <span>结论不一致</span>
            </div>
            <div className="text-xs text-slate-300 mb-2">
              船舶模型计算结论与货舱格计算结论不一致，请人工复核。
              天气等级证据已自动关联，可展开下方查看。
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 bg-red-900/50 rounded text-red-300">
                模型: {modelConclusion.text}
              </span>
              <ArrowRight size={14} className="text-slate-500" />
              <span className="px-2 py-0.5 bg-red-900/50 rounded text-red-300">
                货舱: {gridConclusion.text}
              </span>
            </div>
          </div>
        )}

        <WeatherEvidence expanded={weatherExpanded} onToggle={() => setWeatherExpanded(!weatherExpanded)} />

        <div className="grid grid-cols-3 gap-2">
          <DataLabel value={result.GM} unit="m" label="GM值" status={result.GM < 0.5 ? 'danger' : result.GM < 0.8 ? 'warning' : 'normal'} />
          <DataLabel value={result.heelAngle} unit="°" label="横倾角" status={Math.abs(result.heelAngle) > 5 ? 'danger' : Math.abs(result.heelAngle) > 3 ? 'warning' : 'normal'} />
          <DataLabel value={result.trimAngle} unit="°" label="纵倾角" status={Math.abs(result.trimAngle) > 3 ? 'danger' : Math.abs(result.trimAngle) > 1.5 ? 'warning' : 'normal'} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">重心偏移</h3>
            {checkMode !== 'gravityOffset' && (
              <button
                onClick={() => setCheckMode('gravityOffset')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                人工核对
              </button>
            )}
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">偏移距离</span>
              <DataLabel
                value={result.gravityOffset.distance}
                unit="m"
                status={result.gravityOffset.distance > result.gravityOffset.allowable * 0.7 ? 'danger' : result.gravityOffset.distance > result.gravityOffset.allowable * 0.4 ? 'warning' : 'normal'}
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">允许偏移</span>
              <span className="font-mono text-sm text-slate-200">{result.gravityOffset.allowable}m</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">偏移方向</span>
              <span className="font-mono text-sm text-slate-200">{result.gravityOffset.direction}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-xs text-slate-400 mb-1">重心坐标 (X, Y, Z)</div>
              <div className="font-mono text-xs text-slate-300">
                ({result.centerOfGravity.x.toFixed(1)}m, {result.centerOfGravity.y.toFixed(1)}m, {result.centerOfGravity.z.toFixed(1)}m)
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-200">舱位超载</h3>
            {checkMode !== 'overload' && (
              <button
                onClick={() => setCheckMode('overload')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                人工核对
              </button>
            )}
          </div>
          {result.overloadCells.length > 0 ? (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
              <div className="text-xs text-red-400 mb-2 font-medium">
                发现 {result.overloadCells.length} 个超载舱位
              </div>
              <div className="space-y-1">
                {result.overloadCells.map((cellId) => (
                  <div key={cellId} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-red-300">{cellId}</span>
                    <AlertTriangle size={12} className="text-red-400" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <CheckCircle size={14} />
                <span>所有舱位装载正常，无超载</span>
              </div>
            </div>
          )}
        </div>

        {checkMode && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">
                人工核对 - {checkMode === 'gravityOffset' ? '重心偏移' : checkMode === 'overload' ? '舱位超载' : '结论一致性'}
              </span>
              <button
                onClick={() => setCheckMode(null)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={checkerName}
                onChange={(e) => setCheckerName(e.target.value)}
                placeholder="核对人员姓名"
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              />
              <textarea
                value={checkRemark}
                onChange={(e) => setCheckRemark(e.target.value)}
                placeholder="核对说明（必填，不可修改）"
                rows={2}
                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-xs text-slate-200 focus:border-blue-500 focus:outline-none resize-none"
              />
              <button
                onClick={() => handleManualCheck(checkMode)}
                disabled={!checkRemark || !checkerName}
                className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                确认并签字留痕
              </button>
            </div>
          </div>
        )}

        {relevantChecks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
              <History size={16} className="text-slate-400" />
              人工核对记录
            </h3>
            <div className="space-y-2">
              {relevantChecks.map((check) => (
                <div key={check.id} className="bg-slate-800/50 rounded-lg p-3 border-l-4 border-emerald-500">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <User size={12} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-200">{check.checker}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">
                      {check.checkResult === 'confirmed' ? '已确认' : check.checkResult === 'adjusted' ? '已调整' : '已驳回'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-1">
                    核对项: {check.checkItem === 'gravityOffset' ? '重心偏移' : check.checkItem === 'overload' ? '舱位超载' : check.checkItem === 'ballast' ? '压载水' : '结论一致性'}
                  </div>
                  <div className="text-xs text-slate-300 mb-2">{check.remark}</div>
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Signature size={10} />
                      <span className="font-mono">{check.signature}</span>
                    </div>
                    <span className="text-slate-500">
                      {new Date(check.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Link size={16} className="text-slate-400" />
            版本对应关系
          </h3>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-1">类型</th>
                  <th className="text-left py-1 font-mono">ID</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-700/50">
                  <td className="py-1.5 text-slate-400">船舶模型</td>
                  <td className="py-1.5 font-mono text-blue-400">{currentShip.id}</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-1.5 text-slate-400">货舱格</td>
                  <td className="py-1.5 font-mono text-blue-400">{grid.id}</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-1.5 text-slate-400">压载水版本</td>
                  <td className="py-1.5 font-mono text-blue-400">{currentBallast?.id || '-'}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-400">计算结果</td>
                  <td className="py-1.5 font-mono text-blue-400">{result.id}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
              <div className="flex items-start gap-2 text-[11px]">
                <FileText size={12} className="text-slate-500 mt-0.5" />
                <span className="text-slate-400">模型备注: {shipRemark || currentShip.remark}</span>
              </div>
              {currentBallast && (
                <div className="flex items-start gap-2 text-[11px]">
                  <FileText size={12} className="text-slate-500 mt-0.5" />
                  <span className="text-slate-400">压载水备注: {currentBallast.remark}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center py-2">
          计算时间: {new Date(result.createdAt).toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  );
};
