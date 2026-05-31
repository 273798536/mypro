import { motion } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import type { Case, VerdictDecision } from '@/types';
import { canSubmitVerdict } from '@/utils/gameLogic';
import { useGameStore } from '@/store/useGameStore';

interface VerdictButtonsProps {
  caseItem: Case;
}

export const VerdictButtons = ({ caseItem }: VerdictButtonsProps) => {
  const submitVerdict = useGameStore((state) => state.submitVerdict);
  const canSubmit = canSubmitVerdict(caseItem);

  if (caseItem.isCompleted) {
    const verdictLabels = {
      approve: { text: '授权通过', color: 'text-success-400', icon: CheckCircle },
      reject: { text: '驳回申请', color: 'text-danger-400', icon: XCircle },
      need_more: { text: '需补充材料', color: 'text-accent-400', icon: HelpCircle },
    };
    
    const userVerdict = caseItem.userVerdict ? verdictLabels[caseItem.userVerdict] : null;
    const isCorrect = caseItem.userVerdict === caseItem.correctVerdict;
    const Icon = userVerdict?.icon || HelpCircle;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-4 p-3 rounded-lg ${
          isCorrect ? 'bg-success-500/20 border border-success-500/50' : 'bg-danger-500/20 border border-danger-500/50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon className={isCorrect ? 'text-success-400' : 'text-danger-400'} size={18} />
          <span className={`font-medium ${userVerdict?.color || 'text-white'}`}>
            已判定：{userVerdict?.text || '未判定'}
          </span>
          <span className="text-white/60 text-sm ml-auto">
            {isCorrect ? '✅ 正确' : '❌ 错误'}
          </span>
        </div>
      </motion.div>
    );
  }

  const handleSubmit = (verdict: VerdictDecision) => {
    if (canSubmit) {
      submitVerdict(caseItem.id, verdict);
    }
  };

  return (
    <div className="mt-4">
      <p className="text-xs text-white/60 mb-2">
        {canSubmit ? '请做出判定：' : '收集足够证据后可做出判定'}
      </p>
      <div className="flex gap-2">
        <motion.button
          whileHover={canSubmit ? { scale: 1.02 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          onClick={() => handleSubmit('approve')}
          disabled={!canSubmit}
          className={`verdict-btn verdict-btn-approve flex-1 flex items-center justify-center gap-2 ${
            !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <CheckCircle size={16} />
          授权通过
        </motion.button>
        <motion.button
          whileHover={canSubmit ? { scale: 1.02 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          onClick={() => handleSubmit('reject')}
          disabled={!canSubmit}
          className={`verdict-btn verdict-btn-reject flex-1 flex items-center justify-center gap-2 ${
            !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <XCircle size={16} />
          驳回
        </motion.button>
        <motion.button
          whileHover={canSubmit ? { scale: 1.02 } : {}}
          whileTap={canSubmit ? { scale: 0.98 } : {}}
          onClick={() => handleSubmit('need_more')}
          disabled={!canSubmit}
          className={`verdict-btn verdict-btn-need-more flex-1 flex items-center justify-center gap-2 ${
            !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <HelpCircle size={16} />
          补材料
        </motion.button>
      </div>
    </div>
  );
};
