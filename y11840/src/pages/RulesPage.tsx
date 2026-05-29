import { useNavigate } from 'react-router-dom';
import { DIVERSION_RULES, getRulesByCategory } from '@/game/rules';
import { ERROR_TYPE_LABELS } from '@/types';
import { ArrowLeft, BookOpen, AlertTriangle, Brain, Bot, Users, Star, HelpCircle, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react';
import type { ErrorType, RuleCategory } from '@/types';

export default function RulesPage() {
  const navigate = useNavigate();

  const categoryConfig: Record<RuleCategory, { icon: typeof AlertTriangle; label: string; color: string }> = {
    emotion: { icon: AlertCircle, label: '情绪规则', color: 'text-red-400 bg-red-500/20 border-red-500/30' },
    intent: { icon: Brain, label: '意图规则', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
    bot_limit: { icon: Bot, label: '机器人限制', color: 'text-orange-400 bg-orange-500/20 border-orange-500/30' },
    resource: { icon: Users, label: '资源规则', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
    special: { icon: Star, label: '特殊规则', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
  };

  const errorTypeDetails: Record<ErrorType, { description: string; example: string; prevention: string }> = {
    emotion_misjudge: {
      description: '未能正确识别客户情绪状态，导致分流决策错误。愤怒情绪必须转人工，低置信度情绪需人工判断。',
      example: '客户明确表达愤怒情绪，但仍选择AI处理。',
      prevention: '重点关注情绪标签，愤怒(red)和低置信度(<60%)必须转人工。',
    },
    repeated_reply: {
      description: '机器人已多次重复相同回复，说明AI无法解决问题，继续使用AI会加剧客户不满。',
      example: '机器人已3次回复"请提供订单号"，仍选择AI处理。',
      prevention: '检查历史回复记录，2次以上重复回复必须转人工。',
    },
    delayed_escalation: {
      description: '包含紧急标记的会话（VIP、紧急、重要）没有及时转人工，可能导致严重后果。',
      example: '备注标注"VIP客户，投诉已登记"，但未优先转人工。',
      prevention: '看到特殊标记立即转人工，优先级最高。',
    },
    wrong_diversion: {
      description: '一般性分流决策错误，未命中以上特定错误类型。',
      example: '简单咨询问题错误选择转人工，浪费坐席资源。',
      prevention: '综合判断情绪、意图、机器人能力和资源状态。',
    },
    intent_misjudge: {
      description: '未能正确理解客户意图，投诉、退款、技术支持等复杂意图必须人工处理。',
      example: '客户明确要求退款，但选择AI处理。',
      prevention: '记住：投诉、退款、技术支持、注销账户都必须转人工。',
    },
    resource_ignore: {
      description: '未考虑坐席资源状态，资源紧张时不必要转人工，或资源空闲时未及时转人工。',
      example: '坐席资源过载时仍转人工处理简单咨询。',
      prevention: '关注右侧资源面板，根据繁忙度灵活调整策略。',
    },
  };

  const categories = ['emotion', 'intent', 'bot_limit', 'resource', 'special'] as RuleCategory[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e508_1px,transparent_1px),linear-gradient(to_bottom,#4f46e508_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <header className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-gray-400 hover:text-white hover:bg-slate-700/60 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-400" />
              分流规则说明
            </h1>
            <p className="text-gray-400 mt-1">掌握这些规则，成为分流大师</p>
          </div>
        </header>

        <div className="space-y-8">
          <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              错误类型详解
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {(Object.keys(ERROR_TYPE_LABELS) as ErrorType[]).map(type => {
                const details = errorTypeDetails[type];
                return (
                  <div key={type} className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-red-500/20">
                        <XCircle className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{ERROR_TYPE_LABELS[type]}</h3>
                        <p className="text-sm text-gray-400 mt-1">{details.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="text-red-400 font-medium text-xs mb-1">错误示例</div>
                        <p className="text-red-300/80">{details.example}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-emerald-400 font-medium text-xs mb-1">如何避免</div>
                        <p className="text-emerald-300/80">{details.prevention}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              分流规则库 (共 {DIVERSION_RULES.length} 条)
            </h2>
            
            <div className="space-y-6">
              {categories.map(category => {
                const rules = getRulesByCategory(category);
                if (rules.length === 0) return null;
                const config = categoryConfig[category];
                const Icon = config.icon;
                
                return (
                  <div key={category}>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color} mb-3`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{config.label}</span>
                      <span className="text-xs opacity-70">{rules.length} 条</span>
                    </div>
                    
                    <div className="space-y-2">
                      {rules.map(rule => (
                        <div
                          key={rule.id}
                          className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:border-slate-500/50 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="font-mono text-sm text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">
                              {rule.id}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-white">{rule.name}</h4>
                                <span className="text-xs text-gray-500">
                                  优先级: {rule.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-400 mt-1">{rule.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-400" />
              脏数据处理说明
            </h2>
            <p className="text-gray-400 mb-4">
              培训材料中常有空值和备注，系统会自动处理这些脏数据，不会让整批失败：
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <h4 className="font-medium text-blue-400 mb-2">🔧 自动补全</h4>
                <ul className="text-sm text-blue-300/80 space-y-1">
                  <li>• 情绪为空 → 自动补全为"中性"</li>
                  <li>• 意图为空 → 自动补全为"未知"</li>
                  <li>• 标记置信度低，请注意甄别</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <h4 className="font-medium text-orange-400 mb-2">💡 操作提示</h4>
                <ul className="text-sm text-orange-300/80 space-y-1">
                  <li>• 机器人回复缺失 → 建议优先转人工</li>
                  <li>• 客户消息为空 → 标记警告</li>
                  <li>• 含培训师备注 → 重点提示</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              决策流程图
            </h2>
            <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <div className="text-sm text-gray-300 space-y-2">
                <p className="font-medium text-white mb-3">快速决策口诀：</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-red-400 font-medium mb-1">⚠️ 必须转人工</div>
                    <ul className="text-gray-400 space-y-1 text-xs">
                      <li>• 情绪 = 愤怒 (angry)</li>
                      <li>• 意图 = 投诉/退款/技术支持/注销</li>
                      <li>• 机器人重复回复 {'≥'} 2次</li>
                      <li>• 机器人无有效回复</li>
                      <li>• 备注含 VIP/紧急/重要</li>
                      <li>• 情绪置信度 {'<'} 60%</li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-emerald-400 font-medium mb-1">✅ 可AI处理</div>
                    <ul className="text-gray-400 space-y-1 text-xs">
                      <li>• 情绪 = 中性/满意</li>
                      <li>• 意图 = 普通咨询</li>
                      <li>• 机器人有有效回复</li>
                      <li>• 无重复回复问题</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-600/50">
                  <div className="text-blue-400 font-medium mb-1">👁️ 建议观察</div>
                  <ul className="text-gray-400 space-y-1 text-xs">
                    <li>• 坐席资源严重过载 (critical)</li>
                    <li>• 非紧急问题，情绪稳定</li>
                    <li>• 可先AI处理，待资源释放后跟进</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 active:scale-95"
          >
            开始挑战
          </button>
        </div>
      </div>
    </div>
  );
}
