import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Copy, Check, Stamp, FileText, Shield
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { generateReport, exportReportAsJSON, generateShareLink } from '@/utils/reportGenerator';
import type { DeductionItem } from '@/types/game';

const deductionCategoryLabels: Record<string, { color: string; bg: string; label: string }> = {
  lemma_misuse: { color: 'text-court-red', bg: 'bg-court-red/20', label: '引理错用' },
  condition_missing: { color: 'text-court-yellow', bg: 'bg-court-yellow/20', label: '条件缺失' },
  counterexample_unexcluded: { color: 'text-court-orange', bg: 'bg-court-orange/20', label: '反例未排除' },
};

export default function Report() {
  const navigate = useNavigate();
  const {
    sessionId, theoremTitle, theoremStatement, studentProof,
    conditions, counterExamples, logicLinks, scoreResult,
  } = useGameStore();
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => {
    if (!scoreResult) return null;
    return generateReport(
      sessionId, theoremTitle, theoremStatement, studentProof,
      conditions, counterExamples, logicLinks, scoreResult
    );
  }, [sessionId, theoremTitle, theoremStatement, studentProof, conditions, counterExamples, logicLinks, scoreResult]);

  const handleExportJSON = () => {
    if (!report) return;
    const json = exportReportAsJSON(report);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `判决报告_${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    if (!report) return;
    const link = generateShareLink(report);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!report || !scoreResult) {
    return (
      <div className="wood-grain h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="w-12 h-12 text-court-gold mx-auto" />
          <p className="title-text text-xl text-court-parchment/60">暂无判决报告</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-court-gold/20 border border-court-gold/50 rounded text-court-gold hover:bg-court-gold/30 transition-colors"
          >
            返回法庭
          </button>
        </div>
      </div>
    );
  }

  const gradeConfig: Record<string, string> = {
    S: 'text-court-gold', A: 'text-court-green', B: 'text-court-blue',
    C: 'text-court-yellow', D: 'text-court-red',
  };

  return (
    <div className="wood-grain min-h-screen overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b court-divider bg-court-brown-dark/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settlement')}
            className="p-1.5 hover:bg-court-brown-light rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-court-parchment/60" />
          </button>
          <h1 className="title-text text-xl font-bold text-court-gold">判决报告</h1>
        </div>
        <div className="stamp-effect stamp text-sm">已裁决</div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6 relative">
        <div className="absolute top-20 right-8 pointer-events-none">
          <div className="stamp-effect text-2xl px-4 py-2 opacity-30">
            {scoreResult.grade}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel-border p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Stamp className="w-5 h-5 text-court-gold" />
            <h2 className="title-text text-court-gold font-bold text-lg">案件信息</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <span className="w-24 shrink-0 text-court-parchment/50">案件编号</span>
              <span className="math-text text-court-parchment/80">{sessionId}</span>
            </div>
            <div className="flex">
              <span className="w-24 shrink-0 text-court-parchment/50">案件标题</span>
              <span className="title-text text-court-gold-light font-semibold">{report.caseInfo.title}</span>
            </div>
            <div className="flex">
              <span className="w-24 shrink-0 text-court-parchment/50">定理命题</span>
              <span className="math-text text-court-parchment/80">{report.caseInfo.theorem}</span>
            </div>
            <div className="flex">
              <span className="w-24 shrink-0 text-court-parchment/50">评级</span>
              <span className={cn('title-text text-2xl font-black', gradeConfig[scoreResult.grade])}>
                {scoreResult.grade}
              </span>
              <span className="math-text text-court-gold text-lg ml-2">{scoreResult.totalScore}分</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel-border p-6"
        >
          <h2 className="title-text text-court-gold font-bold text-lg mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />证据摘要
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-court-brown-dark/60 rounded p-3">
              <span className="text-court-parchment/50">条件总数</span>
              <span className="math-text ml-2 text-court-parchment/80">{report.evidenceSummary.totalConditions}</span>
            </div>
            <div className="bg-court-brown-dark/60 rounded p-3">
              <span className="text-court-parchment/50">原始 / 推导</span>
              <span className="math-text ml-2 text-court-parchment/80">
                {report.evidenceSummary.originalCount} / {report.evidenceSummary.derivedCount}
              </span>
            </div>
            <div className="bg-court-brown-dark/60 rounded p-3">
              <span className="text-court-parchment/50">反例-已排除</span>
              <span className="math-text ml-2 text-court-green">{report.evidenceSummary.counterExamples.excluded}</span>
            </div>
            <div className="bg-court-brown-dark/60 rounded p-3">
              <span className="text-court-parchment/50">反例-未排除/待定</span>
              <span className="math-text ml-2 text-court-red">
                {report.evidenceSummary.counterExamples.unexcluded}/{report.evidenceSummary.counterExamples.pending}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel-border p-6"
        >
          <h2 className="title-text text-court-gold font-bold text-lg mb-4">审判详情</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b court-divider text-court-parchment/50">
                  <th className="text-left py-2 px-2">起点</th>
                  <th className="text-left py-2 px-2">终点</th>
                  <th className="text-left py-2 px-2">状态</th>
                  <th className="text-left py-2 px-2">规则</th>
                </tr>
              </thead>
              <tbody>
                {report.judgmentDetails.map((detail, i) => (
                  <tr key={i} className="border-b court-divider/30">
                    <td className="py-1.5 px-2 math-text text-court-parchment/70 max-w-[120px] truncate">{detail.from}</td>
                    <td className="py-1.5 px-2 math-text text-court-parchment/70 max-w-[120px] truncate">{detail.to}</td>
                    <td className="py-1.5 px-2">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px]',
                        detail.status === 'valid' && 'bg-court-green/20 text-court-green',
                        detail.status === 'invalid' && 'bg-court-red/20 text-court-red',
                        detail.status === 'pending' && 'bg-court-yellow/20 text-court-yellow',
                      )}>
                        {detail.status === 'valid' ? '有效' : detail.status === 'invalid' ? '无效' : '待定'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-court-parchment/60">
                      {detail.rule === 'deduction' ? '演绎' : detail.rule === 'induction' ? '归纳' : '反证'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {report.deductionBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="panel-border p-6"
          >
            <h2 className="title-text text-court-red font-bold text-lg mb-4">扣分明细</h2>
            <div className="space-y-2">
              {report.deductionBreakdown.map((d: DeductionItem, i: number) => {
                const cat = deductionCategoryLabels[d.category];
                return (
                  <div key={i} className="flex items-start gap-3 bg-court-brown-dark/40 rounded p-3 text-sm">
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] shrink-0', cat.bg, cat.color)}>
                      {cat.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-court-parchment/80">{d.description}</p>
                      <p className="text-[10px] text-court-parchment/40 mt-0.5">证据: {d.evidenceRef}</p>
                    </div>
                    <span className="math-text font-bold text-court-red shrink-0">{d.pointsDeducted}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="panel-border p-6"
        >
          <h2 className="title-text text-court-gold font-bold text-lg mb-3">审判结论</h2>
          <p className="text-sm text-court-parchment/80 leading-relaxed">{report.conclusion}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="panel-border p-6"
        >
          <h2 className="title-text text-court-gold font-bold text-lg mb-3">证据判定口径</h2>
          <p className="text-xs text-court-parchment/60 leading-relaxed whitespace-pre-line">
            {report.evidenceStandards}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-3 justify-center pb-8"
        >
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-6 py-2.5 bg-court-gold/20 border border-court-gold/50 rounded-lg text-court-gold title-text font-bold hover:bg-court-gold/30 transition-colors"
          >
            <Download className="w-4 h-4" />导出JSON
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-6 py-2.5 bg-court-brown-light border border-court-border rounded-lg text-court-parchment/70 hover:border-court-gold/50 transition-colors"
          >
            {copied ? (
              <><Check className="w-4 h-4 text-court-green" />已复制</>
            ) : (
              <><Copy className="w-4 h-4" />复制分享链接</>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
