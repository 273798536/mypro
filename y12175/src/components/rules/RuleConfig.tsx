import { motion } from 'framer-motion';
import { Settings, Mic, Clock, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function RuleConfig() {
  const { ruleSet, updateRules, importPhase, setPhase } = useStore();

  return (
    <div className="bg-indigo-900/30 rounded-xl p-5 border border-indigo-800">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-450" />
          <h3 className="font-semibold text-lg">规则配置</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            importPhase === 'INIT' ? 'bg-gray-500/20 text-gray-400' :
            importPhase === 'PHASE1' ? 'bg-sky-500/20 text-sky-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            {importPhase === 'INIT' ? '未开始' :
             importPhase === 'PHASE1' ? '第一阶段' : '第二阶段'}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        <div className="p-4 bg-indigo-800/30 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-4 h-4 text-rose-400" />
            <h4 className="font-medium">返场规则</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">最多返场曲目数</label>
              <input
                type="number"
                value={ruleSet.encore.maxEncoreTracks}
                onChange={(e) => updateRules({
                  encore: { ...ruleSet.encore, maxEncoreTracks: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 bg-indigo-800 border border-indigo-700 rounded-lg font-mono focus:outline-none focus:border-amber-450 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">最大返场时长 (秒)</label>
              <input
                type="number"
                value={ruleSet.encore.maxEncoreDuration}
                onChange={(e) => updateRules({
                  encore: { ...ruleSet.encore, maxEncoreDuration: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 bg-indigo-800 border border-indigo-700 rounded-lg font-mono focus:outline-none focus:border-amber-450 transition-colors"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={ruleSet.encore.allowExtraEncore}
              onChange={(e) => updateRules({
                encore: { ...ruleSet.encore, allowExtraEncore: e.target.checked }
              })}
              className="w-4 h-4 rounded border-indigo-600 bg-indigo-800 text-amber-450 focus:ring-amber-450"
            />
            <span className="text-sm">允许额外返场（超限仅警告）</span>
          </label>
        </div>

        <div className="p-4 bg-indigo-800/30 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-sky-400" />
            <h4 className="font-medium">换场设置</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">默认换场时间 (秒)</label>
              <input
                type="number"
                value={ruleSet.defaultTransitionTime}
                onChange={(e) => updateRules({
                  defaultTransitionTime: parseInt(e.target.value) || 30
                })}
                className="w-full px-3 py-2 bg-indigo-800 border border-indigo-700 rounded-lg font-mono focus:outline-none focus:border-amber-450 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">要求换场时间 (秒)</label>
              <input
                type="number"
                value={ruleSet.encore.requiredTransitionTime}
                onChange={(e) => updateRules({
                  encore: { ...ruleSet.encore, requiredTransitionTime: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 bg-indigo-800 border border-indigo-700 rounded-lg font-mono focus:outline-none focus:border-amber-450 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-indigo-800/30 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="font-medium">版本差异阈值</h4>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">版本差异警告阈值 (%)</label>
            <input
              type="range"
              min="0"
              max="50"
              value={ruleSet.versionErrorThreshold * 100}
              onChange={(e) => updateRules({
                versionErrorThreshold: parseInt(e.target.value) / 100
              })}
              className="w-full h-2 bg-indigo-700 rounded-lg appearance-none cursor-pointer accent-amber-450"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span className="text-amber-450 font-medium">{Math.round(ruleSet.versionErrorThreshold * 100)}%</span>
              <span>50%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
