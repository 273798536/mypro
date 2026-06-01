import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  ChevronDown,
  ChevronUp,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { useCalculationStore } from '@/store/calculationStore';
import { ResultOverview } from '@/components/ResultOverview';
import { CalculationTracePanel } from '@/components/CalculationTracePanel';
import { ContradictionPanel } from '@/components/ContradictionPanel';
import { BranchSummaryTable } from '@/components/BranchSummaryTable';
import { UnitValidationPanel } from '@/components/UnitValidationPanel';

export default function ResultPage() {
  const navigate = useNavigate();
  const { session, selectedPressureUnit } = useCalculationStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'trace' | 'branches' | 'contradictions' | 'validation'>('overview');

  if (!session.results) {
    return (
      <div className="tech-card p-12 text-center">
        <Calculator className="w-16 h-16 text-industrial-textMuted mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-industrial-text mb-2">尚无计算结果</h2>
        <p className="text-industrial-textMuted mb-6">请先返回输入页面，填写参数并执行计算</p>
        <button
          onClick={() => navigate('/')}
          className="tech-button inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          返回输入
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: '结果总览', icon: <Calculator className="w-4 h-4" /> },
    { key: 'trace' as const, label: '计算追溯', icon: <Calculator className="w-4 h-4" /> },
    { key: 'branches' as const, label: '支路汇总', icon: <Calculator className="w-4 h-4" /> },
    { key: 'contradictions' as const, label: '矛盾证据', icon: <AlertTriangle className="w-4 h-4" /> },
    { key: 'validation' as const, label: '单位校验', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const errorCount = session.results.contradictions.filter(c => c.severity === 'error').length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-industrial-textMuted hover:text-industrial-text hover:bg-primary-900/30 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-industrial-text">计算结果</h2>
            <p className="text-xs text-industrial-textMuted">{session.title}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/report')}
          className="tech-button flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          查看报告
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-1 bg-industrial-surface border border-industrial-border rounded-lg p-1 overflow-x-auto"
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-tech'
                : 'text-industrial-textMuted hover:text-industrial-text hover:bg-primary-900/30'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'contradictions' && errorCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-danger-500 text-white text-xs rounded-full">
                {errorCount}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <ResultOverview session={session} pressureUnit={selectedPressureUnit} />
        )}

        {activeTab === 'trace' && (
          <div className="space-y-6">
            {session.mainSegments.map(segment => {
              const result = session.results!.segmentResults[segment.id];
              if (!result) return null;
              return (
                <CalculationTracePanel
                  key={segment.id}
                  results={result}
                  segmentName={segment.name}
                />
              );
            })}
            {session.branches.flatMap(b => b.segments).map(segment => {
              const result = session.results!.segmentResults[segment.id];
              if (!result) return null;
              return (
                <CalculationTracePanel
                  key={segment.id}
                  results={result}
                  segmentName={`[支路] ${segment.name}`}
                />
              );
            })}
          </div>
        )}

        {activeTab === 'branches' && (
          <BranchSummaryTable session={session} pressureUnit={selectedPressureUnit} />
        )}

        {activeTab === 'contradictions' && (
          <ContradictionPanel contradictions={session.results.contradictions} />
        )}

        {activeTab === 'validation' && (
          <UnitValidationPanel showLive={false} />
        )}
      </motion.div>
    </div>
  );
}
