
import { useState } from 'react';
import { RULES, WIND_EFFECTS, WIND_LABELS, VIOLATION_LABELS } from '@/constants';
import { BookOpen, Wind, Zap, Navigation, Database, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function RulesPage() {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: '全部规则', icon: BookOpen },
    { id: 'wind', name: '风场规则', icon: Wind },
    { id: 'path', name: '路径规则', icon: Navigation },
    { id: 'energy', name: '能量规则', icon: Zap },
    { id: 'data', name: '数据规则', icon: Database }
  ];

  const filteredRules = activeCategory === 'all' 
    ? RULES 
    : RULES.filter(r => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">游戏规则说明</h1>
          <p className="text-slate-400">理解风场影响、路径规划和能量管理的核心规则</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 mb-6">
          <h2 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <Wind className="w-5 h-5" />
            风场影响说明
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            不同风场对无人机的能耗和飞行速度有不同影响。合理规划航线避开逆风区是获得高分的关键。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(WIND_EFFECTS).map(([type, effect]) => (
              <div 
                key={type}
                className={`p-4 rounded-lg border ${
                  type === 'headwind' ? 'bg-red-500/10 border-red-500/30' :
                  type === 'tailwind' ? 'bg-green-500/10 border-green-500/30' :
                  type === 'crosswind' ? 'bg-orange-500/10 border-orange-500/30' :
                  'bg-slate-700/50 border-slate-600/30'
                }`}
              >
                <div className={`font-bold mb-2 ${
                  type === 'headwind' ? 'text-red-400' :
                  type === 'tailwind' ? 'text-green-400' :
                  type === 'crosswind' ? 'text-orange-400' :
                  'text-slate-300'
                }`}>
                  {WIND_LABELS[type as keyof typeof WIND_LABELS]}
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>能耗: <span className={
                    effect.consumptionMultiplier > 1 ? 'text-red-400' : 
                    effect.consumptionMultiplier < 1 ? 'text-green-400' : 'text-slate-300'
                  }>×{effect.consumptionMultiplier}</span></div>
                  <div>速度: <span className={
                    effect.speedMultiplier < 1 ? 'text-red-400' : 
                    effect.speedMultiplier > 1 ? 'text-green-400' : 'text-slate-300'
                  }>×{effect.speedMultiplier}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredRules.map(rule => (
            <div
              key={rule.id}
              className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    rule.category === 'wind' ? 'bg-red-500/20 text-red-400' :
                    rule.category === 'path' ? 'bg-cyan-500/20 text-cyan-400' :
                    rule.category === 'energy' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {rule.category === 'wind' && <Wind className="w-5 h-5" />}
                    {rule.category === 'path' && <Navigation className="w-5 h-5" />}
                    {rule.category === 'energy' && <Zap className="w-5 h-5" />}
                    {rule.category === 'data' && <Database className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">{rule.id}</span>
                      <span className="font-medium text-white">{rule.name}</span>
                    </div>
                    <div className="text-sm text-red-400 mt-0.5">违规扣分: {rule.penalty}分</div>
                  </div>
                </div>
                {expandedRule === rule.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {expandedRule === rule.id && (
                <div className="px-4 pb-4 border-t border-slate-700/50">
                  <div className="pt-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-cyan-400" />
                      规则说明
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {rule.description}
                    </p>
                    
                    <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-orange-400 font-medium">违规后果</p>
                          <p className="text-xs text-slate-400 mt-1">
                            违反此规则将扣除 <span className="text-red-400 font-medium">{rule.penalty}分</span>，
                            并在飞行记录中标记为 <span className="text-orange-400">{VIOLATION_LABELS[rule.id.toLowerCase().replace('r', '')] || '违规'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            常见错误案例
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-400 font-medium mb-2">❌ 错误做法</h4>
              <ul className="text-sm text-slate-400 space-y-2">
                <li>• 直接穿越强逆风区域节省距离</li>
                <li>• 忽略返航电量计算</li>
                <li>• 设置过多不必要的航点</li>
                <li>• 飞行结束后很久才补录数据</li>
                <li>• 不填写飞行员姓名</li>
              </ul>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-400 font-medium mb-2">✅ 正确做法</h4>
              <ul className="text-sm text-slate-400 space-y-2">
                <li>• 规划航线时主动绕开逆风区</li>
                <li>• 随时关注返航安全余量</li>
                <li>• 用最少航点完成任务</li>
                <li>• 飞行结束后24小时内录入数据</li>
                <li>• 完整填写所有必要字段</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-lg font-bold text-cyan-400 mb-4">评分计算方式</h2>
          <div className="text-sm text-slate-400 space-y-2">
            <p>基础分为 100 分，根据以下因素进行调整：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>每项违规扣除对应分数（如逆风耗电扣15分）</li>
              <li>能量效率系数影响最终得分：效率越高，得分越高</li>
              <li>最终得分 = (基础分 - 扣分项) × (0.5 + 能量效率 × 0.5)</li>
              <li>最低 0 分，最高 100 分</li>
            </ul>
            <p className="mt-3 text-cyan-400">
              💡 提示：合理规划航线，平衡飞行距离与风场影响，才能获得高分！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
