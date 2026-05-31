import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Link2, Shield, Eye, FileDown, Gavel } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import type { DeductionItem } from '@/types/game';

const gradeConfig: Record<string, { color: string; bg: string; label: string }> = {
  S: { color: 'text-court-gold', bg: 'bg-court-gold/20 border-court-gold/50', label: '完美' },
  A: { color: 'text-court-green', bg: 'bg-court-green/20 border-court-green/50', label: '优秀' },
  B: { color: 'text-court-blue', bg: 'bg-court-blue/20 border-court-blue/50', label: '良好' },
  C: { color: 'text-court-yellow', bg: 'bg-court-yellow/20 border-court-yellow/50', label: '及格' },
  D: { color: 'text-court-red', bg: 'bg-court-red/20 border-court-red/50', label: '不及格' },
};

const deductionCategoryConfig: Record<string, { color: string; bg: string; label: string }> = {
  lemma_misuse: { color: 'text-court-red', bg: 'bg-court-red/20', label: '引理错用' },
  condition_missing: { color: 'text-court-yellow', bg: 'bg-court-yellow/20', label: '条件缺失' },
  counterexample_unexcluded: { color: 'text-court-orange', bg: 'bg-court-orange/20', label: '反例未排除' },
};

export default function Settlement() {
  const navigate = useNavigate();
  const { scoreResult, stepRecords, elapsedTime, totalTime, resetGame } = useGameStore();

  if (!scoreResult) {
    return (
      <div className="wood-grain h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Gavel className="w-12 h-12 text-court-gold mx-auto" />
          <p className="title-text text-xl text-court-parchment/60">尚未完成审判</p>
          <button
            onClick={() => { resetGame(); navigate('/'); }}
            className="px-6 py-2 bg-court-gold/20 border border-court-gold/50 rounded text-court-gold hover:bg-court-gold/30 transition-colors"
          >
            返回法庭
          </button>
        </div>
      </div>
    );
  }

  const grade = gradeConfig[scoreResult.grade];
  const elapsedMins = Math.floor(elapsedTime / 60);
  const elapsedSecs = elapsedTime % 60;

  return (
    <div className="wood-grain min-h-screen p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 py-6"
        >
          <Trophy className="w-12 h-12 text-court-gold mx-auto" />
          <div className="flex items-center justify-center gap-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
              className={cn('w-24 h-24 rounded-full border-4 flex items-center justify-center', grade.bg)}
            >
              <span className={cn('title-text text-5xl font-black', grade.color)}>
                {scoreResult.grade}
              </span>
            </motion.div>
            <div className="text-left">
              <p className="text-court-parchment/50 text-sm">审判评级</p>
              <p className={cn('title-text text-lg font-bold', grade.color)}>{grade.label}</p>
              <p className="math-text text-5xl font-bold text-court-gold gold-glow mt-1">
                {scoreResult.totalScore}
              </p>
              <p className="math-text text-sm text-court-parchment/50">
                满分 {scoreResult.maxScore}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="panel-border p-4"
        >
          <div className="grid grid-cols-5 gap-3 text-center">
            <div className="bg-court-brown-dark/60 rounded-lg p-3">
              <Link2 className="w-4 h-4 text-court-gold mx-auto mb-1" />
              <p className="math-text text-lg font-bold text-court-gold-light">
                {scoreResult.linkScore}/{scoreResult.linkMaxScore}
              </p>
              <p className="text-[10px] text-court-parchment/50">连线得分</p>
            </div>
            <div className="bg-court-brown-dark/60 rounded-lg p-3">
              <Shield className="w-4 h-4 text-court-blue mx-auto mb-1" />
              <p className="math-text text-lg font-bold text-court-blue">
                {scoreResult.evidenceScore}/{scoreResult.evidenceMaxScore}
              </p>
              <p className="text-[10px] text-court-parchment/50">证据得分</p>
            </div>
            <div className="bg-court-brown-dark/60 rounded-lg p-3">
              <Trophy className="w-4 h-4 text-court-gold mx-auto mb-1" />
              <p className="math-text text-lg font-bold text-court-gold">
                +{scoreResult.timeBonus}
              </p>
              <p className="text-[10px] text-court-parchment/50">时间奖励</p>
            </div>
            <div className="bg-court-brown-dark/60 rounded-lg p-3 col-span-2">
              <Clock className="w-4 h-4 text-court-parchment/50 mx-auto mb-1" />
              <p className="math-text text-lg font-bold text-court-parchment/80">
                {elapsedMins}分{elapsedSecs}秒
              </p>
              <p className="text-[10px] text-court-parchment/50">
                用时 / 限时 {Math.floor(totalTime / 60)}分
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="panel-border p-4"
        >
          <h3 className="title-text text-court-gold font-bold text-sm mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4" />操作记录
          </h3>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b court-divider text-court-parchment/50">
                  <th className="text-left py-1.5 px-2">#</th>
                  <th className="text-left py-1.5 px-2">操作</th>
                  <th className="text-left py-1.5 px-2">详情</th>
                  <th className="text-right py-1.5 px-2">分数</th>
                </tr>
              </thead>
              <tbody>
                {stepRecords.map((step, i) => (
                  <tr key={step.id} className="border-b court-divider/30 hover:bg-court-brown-light/30">
                    <td className="py-1.5 px-2 text-court-parchment/40">{i + 1}</td>
                    <td className="py-1.5 px-2">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px]',
                        step.actionType === 'link' && 'bg-court-gold/20 text-court-gold',
                        step.actionType === 'judge' && 'bg-court-blue/20 text-court-blue',
                        step.actionType === 'exclude' && 'bg-court-green/20 text-court-green',
                        step.actionType === 'import' && 'bg-court-orange/20 text-court-orange',
                        step.actionType === 'place_card' && 'bg-court-parchment/10 text-court-parchment/60',
                        step.actionType === 'remove_link' && 'bg-court-red/20 text-court-red',
                      )}>
                        {step.actionType === 'link' ? '连线' :
                         step.actionType === 'judge' ? '判定' :
                         step.actionType === 'exclude' ? '排除' :
                         step.actionType === 'import' ? '导入' :
                         step.actionType === 'place_card' ? '放置' : '移除'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 math-text text-court-parchment/70 max-w-xs truncate">
                      {step.actionDetail}
                    </td>
                    <td className={cn(
                      'py-1.5 px-2 text-right math-text font-medium',
                      step.scoreDelta > 0 && 'text-court-green',
                      step.scoreDelta < 0 && 'text-court-red',
                      step.scoreDelta === 0 && 'text-court-parchment/40',
                    )}>
                      {step.scoreDelta > 0 ? `+${step.scoreDelta}` : step.scoreDelta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {scoreResult.deductions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="panel-border p-4"
          >
            <h3 className="title-text text-court-red font-bold text-sm mb-3">扣分明细</h3>
            <div className="space-y-2">
              {scoreResult.deductions.map((d: DeductionItem, i: number) => {
                const cat = deductionCategoryConfig[d.category];
                return (
                  <div key={i} className="flex items-start gap-3 bg-court-brown-dark/40 rounded p-2.5">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', cat.bg, cat.color)}>
                      {cat.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-court-parchment/80">{d.description}</p>
                      <p className="text-[10px] text-court-parchment/40 mt-0.5">证据引用: {d.evidenceRef}</p>
                    </div>
                    <span className="math-text text-sm font-bold text-court-red shrink-0">
                      {d.pointsDeducted}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3 justify-center pb-8"
        >
          <button
            onClick={() => navigate('/review')}
            className="flex items-center gap-2 px-6 py-2.5 bg-court-gold/20 border border-court-gold/50 rounded-lg text-court-gold title-text font-bold hover:bg-court-gold/30 transition-colors"
          >
            <Eye className="w-4 h-4" />查看复盘
          </button>
          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 px-6 py-2.5 bg-court-brown-light border border-court-border rounded-lg text-court-parchment/70 hover:border-court-gold/50 transition-colors"
          >
            <FileDown className="w-4 h-4" />导出报告
          </button>
        </motion.div>
      </div>
    </div>
  );
}
