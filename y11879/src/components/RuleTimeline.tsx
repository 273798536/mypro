import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getStuckSteps } from '../utils/rankingEngine';
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RankingStep } from '../types';

const RuleTimeline = () => {
  const { rules, calculationResult, athletes } = useAppStore();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const enabledRules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  const stuckSteps = calculationResult ? getStuckSteps(calculationResult.results) : [];

  const getStepStatus = (rule: typeof enabledRules[0], index: number) => {
    if (!calculationResult) return 'pending';
    
    const allSteps = calculationResult.results.flatMap((r) => r.steps);
    const stepForRule = allSteps.find((s) => s.ruleId === rule.id);
    
    if (stepForRule) {
      if (stepForRule.status === 'stuck') return 'stuck';
      if (stepForRule.status === 'resolved') return 'resolved';
      return 'tied';
    }
    
    const hasStuckAfter = stuckSteps.some((s) => s.stepNumber > index);
    return hasStuckAfter ? 'tied' : 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'tied':
        return <Circle className="w-5 h-5 text-warning" />;
      case 'stuck':
        return <AlertTriangle className="w-5 h-5 text-danger animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-dark-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'border-success bg-success/10';
      case 'tied':
        return 'border-warning bg-warning/10';
      case 'stuck':
        return 'border-danger bg-danger/10 animate-pulse';
      default:
        return 'border-dark-500 bg-dark-700/50';
    }
  };

  const getLineColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-success';
      case 'tied':
        return 'bg-warning';
      case 'stuck':
        return 'bg-danger';
      default:
        return 'bg-dark-600';
    }
  };

  const getTiedAthletesForRule = (ruleId: string): RankingStep | undefined => {
    if (!calculationResult) return undefined;
    return calculationResult.results.flatMap((r) => r.steps).find((s) => s.ruleId === ruleId);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-5 h-5 text-primary-500" />
          <h3 className="font-display font-semibold text-white text-lg">排序规则主线</h3>
        </div>
        {stuckSteps.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-danger/20 text-danger rounded-full text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>{stuckSteps.length} 处卡壳</span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-dark-600" />
        
        <div className="space-y-4">
          <div className="relative pl-16">
            <div className="absolute left-4 w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div className="card p-4 border-primary-500/30 bg-primary-500/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white">加权总分排序</h4>
                  <p className="text-sm text-dark-300">按各项目得分 × 项目权重计算总分</p>
                </div>
                <div className="px-3 py-1 bg-success/20 text-success rounded-full text-sm">
                  基础规则
                </div>
              </div>
            </div>
          </div>

          {enabledRules.map((rule, index) => {
            const status = getStepStatus(rule, index);
            const stepData = getTiedAthletesForRule(rule.id);
            const isExpanded = expandedStep === rule.id;

            return (
              <div key={rule.id} className="relative pl-16">
                <div className={`absolute left-8 top-0 w-0.5 h-full ${getLineColor(status)} opacity-50`} />
                
                <div className="absolute left-4">
                  {getStatusIcon(status)}
                </div>

                <motion.div
                  layout
                  className={`card p-4 cursor-pointer transition-all duration-200 ${getStatusColor(status)} ${status === 'stuck' ? 'glow-effect' : ''}`}
                  onClick={() => setExpandedStep(isExpanded ? null : rule.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{rule.name}</h4>
                        <span className="text-xs text-dark-400">规则 #{index + 2}</span>
                      </div>
                      <p className="text-sm text-dark-300 mt-1">{rule.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {stepData && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          stepData.status === 'resolved' ? 'bg-success/20 text-success' :
                          stepData.status === 'tied' ? 'bg-warning/20 text-warning' :
                          'bg-danger/20 text-danger'
                        }`}>
                          {stepData.tiedAthletes.length} 人同分
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-dark-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-dark-400" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && stepData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-dark-600">
                          <p className="text-sm text-dark-300 mb-3">{stepData.explanation}</p>
                          <div className="space-y-2">
                            {stepData.tiedAthletes.map((athleteId) => {
                              const athlete = athletes.find((a) => a.id === athleteId);
                              const score = stepData.scores[athleteId] || 0;
                              return (
                                <div
                                  key={athleteId}
                                  className="flex items-center justify-between px-3 py-2 bg-dark-700/50 rounded-lg"
                                >
                                  <span className="text-white">{athlete?.name}</span>
                                  <span className="font-mono text-primary-400">
                                    {score.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          })}

          {stuckSteps.length > 0 && stuckSteps.map((step) => (
            <div key={step.stepNumber} className="relative pl-16">
              <div className="absolute left-8 top-0 w-0.5 h-full bg-danger opacity-50" />
              
              <div className="absolute left-4">
                <AlertTriangle className="w-5 h-5 text-danger animate-pulse" />
              </div>

              <div className="card p-4 border-danger/50 bg-danger/10 glow-effect">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-danger/20 text-danger rounded text-xs font-medium">
                    卡壳
                  </span>
                  <h4 className="font-semibold text-danger">同分规则已用尽</h4>
                </div>
                <p className="text-sm text-dark-300 mb-3">{step.explanation}</p>
                <div className="flex flex-wrap gap-2">
                  {step.tiedAthletes.map((athleteId) => {
                    const athlete = athletes.find((a) => a.id === athleteId);
                    return (
                      <span
                        key={athleteId}
                        className="px-3 py-1 bg-danger/20 text-danger rounded-full text-sm"
                      >
                        {athlete?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RuleTimeline;
