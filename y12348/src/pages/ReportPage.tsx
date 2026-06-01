import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calculator,
} from 'lucide-react';
import { useCalculationStore } from '@/store/calculationStore';
import { ReportExport } from '@/components/ReportExport';

export default function ReportPage() {
  const navigate = useNavigate();
  const { session, selectedPressureUnit } = useCalculationStore();

  if (!session.results) {
    return (
      <div className="tech-card p-12 text-center">
        <Calculator className="w-16 h-16 text-industrial-textMuted mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-industrial-text mb-2">尚无计算结果</h2>
        <p className="text-industrial-textMuted mb-6">请先完成数据输入并执行计算</p>
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => navigate('/result')}
          className="p-2 text-industrial-textMuted hover:text-industrial-text hover:bg-primary-900/30 rounded transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-industrial-text">计算报告</h2>
          <p className="text-xs text-industrial-textMuted">{session.title}</p>
        </div>
      </motion.div>

      <ReportExport session={session} pressureUnit={selectedPressureUnit} />
    </div>
  );
}
