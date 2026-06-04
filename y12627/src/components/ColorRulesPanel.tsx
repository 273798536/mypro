import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, FileWarning, Sparkles, Search } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { COLOR_RULES, FRIENDLY_MESSAGES } from '@/constants/colorRules';
import { SAMPLE_DATA_LIST } from '@/constants/sampleData';
import type { TankStatus } from '@/types';

export function ColorRulesPanel() {
  const [expandedRules, setExpandedRules] = useState<Set<TankStatus>>(new Set(['error']));
  const [expandedSamples, setExpandedSamples] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState(true);
  
  const { tanks, selectedTankId, setSelectedTankId, loadSample, records } = useCanvasStore();

  const toggleRule = (status: TankStatus) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleTankClick = (tankId: string) => {
    setSelectedTankId(tankId);
  };

  const errorTanks = tanks.filter(t => t.status === 'error');
  const warningTanks = tanks.filter(t => t.status === 'warning');

  const getRelatedRecords = (tankId: string) => {
    return records.filter(r => r.relatedTankId === tankId).slice(-3);
  };

  return (
    <div className="w-80 h-full flex flex-col gap-4 p-4 overflow-y-auto scrollbar-thin">
      <div className="text-center">
        <h2 className="font-display text-2xl text-ocean-700">颜色规则说明</h2>
        <p className="text-sm text-ocean-600 mt-1">顺着颜色查问题，一眼就懂</p>
      </div>

      <div className="panel-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-ocean-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            状态色卡
          </h3>
        </div>
        <div className="space-y-2">
          {Object.values(COLOR_RULES).map(rule => (
            <div key={rule.status} className="border border-ocean-100 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRule(rule.status)}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-ocean-50 transition-colors"
              >
                <div
                  className="w-5 h-5 rounded-md flex-shrink-0"
                  style={{ backgroundColor: rule.color }}
                />
                <span className="font-medium text-sm flex-1 text-left">{rule.label}</span>
                {expandedRules.has(rule.status) ? (
                  <ChevronDown className="w-4 h-4 text-ocean-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-ocean-500" />
                )}
              </button>
              {expandedRules.has(rule.status) && (
                <div className="px-3 pb-3 text-sm space-y-2 border-t border-ocean-50">
                  <div className="pt-2">
                    <p className="text-gray-600 text-xs">问题说明</p>
                    <p className="text-gray-800">{rule.description}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">处理意见</p>
                    <p className="text-ocean-700 font-medium">{rule.handling}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-card rounded-xl p-4">
        <button
          onClick={() => setExpandedSamples(!expandedSamples)}
          className="w-full flex items-center justify-between mb-2"
        >
          <h3 className="font-medium text-ocean-800 flex items-center gap-2">
            <FileWarning className="w-4 h-4" />
            样例数据
          </h3>
          {expandedSamples ? (
            <ChevronDown className="w-4 h-4 text-ocean-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ocean-500" />
          )}
        </button>
        {expandedSamples && (
          <div className="space-y-2">
            {SAMPLE_DATA_LIST.map(sample => (
              <button
                key={sample.id}
                onClick={() => loadSample(sample.id)}
                className="w-full text-left p-3 rounded-lg border border-ocean-100 hover:bg-ocean-50 hover:border-ocean-300 transition-all"
              >
                <p className="font-medium text-sm text-ocean-800">{sample.name}</p>
                <p className="text-xs text-gray-500 mt-1">{sample.description}</p>
                <p className="text-xs text-ocean-600 mt-1">展缸数：{sample.tanks.length}个</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel-card rounded-xl p-4">
        <button
          onClick={() => setExpandedErrors(!expandedErrors)}
          className="w-full flex items-center justify-between mb-2"
        >
          <h3 className="font-medium text-ocean-800 flex items-center gap-2">
            <Search className="w-4 h-4" />
            异常快速追溯
          </h3>
          {expandedErrors ? (
            <ChevronDown className="w-4 h-4 text-ocean-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ocean-500" />
          )}
        </button>
        {expandedErrors && (
          <div className="space-y-3">
            {errorTanks.length > 0 && (
              <div>
                <p className="text-xs text-red-600 font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  需处理异常（{errorTanks.length}个）
                </p>
                {errorTanks.map(tank => (
                  <div
                    key={tank.id}
                    onClick={() => handleTankClick(tank.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all mb-2 ${
                      selectedTankId === tank.id
                        ? 'border-tank-error bg-red-50'
                        : 'border-red-200 hover:border-red-400 bg-white'
                    }`}
                  >
                    <p className="font-medium text-sm text-red-800">{tank.name}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {tank.missingUnit ? FRIENDLY_MESSAGES.missingUnit : '数据异常'}
                    </p>
                    {getRelatedRecords(tank.id).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-red-100">
                        <p className="text-xs text-gray-500">相关操作记录：</p>
                        {getRelatedRecords(tank.id).map(rec => (
                          <p key={rec.id} className="text-xs text-gray-600 mt-1">
                            • {rec.description}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-tank-error text-white rounded-full">
                        颜色规则
                      </span>
                      <span className="text-gray-600">
                        → {COLOR_RULES.error.handling}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {warningTanks.length > 0 && (
              <div>
                <p className="text-xs text-orange-600 font-medium mb-2 flex items-center gap-1">
                  <FileWarning className="w-3 h-3" />
                  需关注数据（{warningTanks.length}个）
                </p>
                {warningTanks.map(tank => (
                  <div
                    key={tank.id}
                    onClick={() => handleTankClick(tank.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all mb-2 ${
                      selectedTankId === tank.id
                        ? 'border-tank-warning bg-orange-50'
                        : 'border-orange-200 hover:border-orange-400 bg-white'
                    }`}
                  >
                    <p className="font-medium text-sm text-orange-800">{tank.name}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      {tank.source === 'supplement' ? FRIENDLY_MESSAGES.supplementData : tank.remark}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-tank-warning text-white rounded-full">
                        颜色规则
                      </span>
                      <span className="text-gray-600">
                        → {COLOR_RULES.warning.handling}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {errorTanks.length === 0 && warningTanks.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">暂无异常数据</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel-card rounded-xl p-4">
        <h3 className="font-medium text-ocean-800 mb-3">离线素材说明</h3>
        <div className="text-xs text-gray-600 space-y-2">
          <p className="flex items-start gap-2">
            <span className="text-ocean-600">📄</span>
            <span>{FRIENDLY_MESSAGES.offlineAsset}</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-ocean-600">🔍</span>
            <span>验收时请沿"异常→颜色规则→处理意见→原始档案"路径追溯</span>
          </p>
        </div>
      </div>
    </div>
  );
}
