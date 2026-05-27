import { motion } from 'framer-motion';
import { User, Clock, Target } from 'lucide-react';
import { Case } from '@/types/game';
import { getDifficultyName } from '@/utils/gameEngine';

interface CaseInfoProps {
  caseData: Case;
}

const emotionEmojis: Record<string, string> = {
  happy: '😊',
  neutral: '😐',
  angry: '😠'
};

export const CaseInfo = ({ caseData }: CaseInfoProps) => {
  return (
    <motion.div
      className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white shadow-xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-3xl shadow-lg"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {caseData.customer.avatar}
          </motion.div>
          <div>
            <h1 className="text-xl font-bold">{caseData.title}</h1>
            <div className="flex items-center gap-2 mt-1 text-slate-300 text-sm">
              <User className="w-4 h-4" />
              <span>{caseData.customer.name}</span>
              <span className="text-2xl ml-2">{emotionEmojis[caseData.customer.emotion]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-lg font-bold">
                {Math.floor(caseData.timeLimit / 60)}分{caseData.timeLimit % 60}秒
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">时限</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-2 text-emerald-400">
              <Target className="w-5 h-5" />
              <span className="font-bold">{getDifficultyName(caseData.difficulty)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">难度</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-slate-900/50 rounded-xl">
        <p className="text-slate-300 text-sm leading-relaxed">
          📋 {caseData.description}
        </p>
      </div>
    </motion.div>
  );
};
