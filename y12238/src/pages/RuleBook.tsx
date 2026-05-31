import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronDown, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { RULES, getRulesByCategory } from '@/data/rules';

const categories = ['排队规则', '版本管理', '班次管理', '预约管理', '判定规则', '证据管理'];

export default function RuleBook() {
  const navigate = useNavigate();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '排队规则':
        return <FileText size={20} />;
      case '版本管理':
        return <AlertTriangle size={20} />;
      case '班次管理':
        return <CheckCircle size={20} />;
      default:
        return <BookOpen size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-port-dark text-white py-4 px-6">
        <div className="container mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">规则手册</h1>
            <p className="text-sm text-gray-400">港口集卡排队棋完整规则说明</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-4">
          {categories.map((category, categoryIndex) => {
            const rules = getRulesByCategory(category);
            const isCategoryExpanded = expandedCategory === category;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedCategory(isCategoryExpanded ? null : category)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-port-blue/10 text-port-blue rounded-lg">
                      {getCategoryIcon(category)}
                    </span>
                    <span className="font-bold text-lg">{category}</span>
                    <span className="text-sm text-gray-500">({rules.length} 条规则)</span>
                  </div>
                  <motion.div
                    animate={{ rotate: isCategoryExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={24} className="text-gray-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isCategoryExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {rules.map((rule, ruleIndex) => {
                          const isRuleExpanded = expandedRule === rule.id;

                          return (
                            <motion.div
                              key={rule.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: ruleIndex * 0.05 }}
                              className="border border-gray-200 rounded-lg overflow-hidden"
                            >
                              <button
                                onClick={() => setExpandedRule(isRuleExpanded ? null : rule.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800">{rule.title}</div>
                                  <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                                    {rule.description}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    rule.penalty.includes('扣') 
                                      ? 'bg-port-red/10 text-port-red'
                                      : rule.penalty.includes('警告')
                                      ? 'bg-port-yellow/10 text-port-yellow'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {rule.penalty}
                                  </span>
                                  <ChevronDown
                                    size={18}
                                    className={`text-gray-400 transition-transform ${
                                      isRuleExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </div>
                              </button>

                              <AnimatePresence>
                                {isRuleExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                                      <div className="mb-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">规则说明</h4>
                                        <p className="text-gray-600 text-sm">{rule.description}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">示例</h4>
                                        <ul className="space-y-2">
                                          {rule.examples.map((example, i) => (
                                            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                              <span className="text-port-blue">•</span>
                                              {example}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 bg-port-blue/5 border border-port-blue/20 rounded-xl p-6">
          <h3 className="font-bold text-lg text-port-blue mb-3 flex items-center gap-2">
            <AlertTriangle size={20} />
            重要提示
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-port-blue">•</span>
              所有版本变更记录将作为证据永久保留，不可修改或删除
            </li>
            <li className="flex items-start gap-2">
              <span className="text-port-blue">•</span>
              闸口判定不一致时，司机班次记录将作为补充证据保留
            </li>
            <li className="flex items-start gap-2">
              <span className="text-port-blue">•</span>
              班次超时记录不会被新版本覆盖，始终可见
            </li>
            <li className="flex items-start gap-2">
              <span className="text-port-blue">•</span>
              导出报告中的闸口结论与页面显示、终端日志完全一致
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
