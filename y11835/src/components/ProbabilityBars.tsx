import { motion } from 'framer-motion';

export default function ProbabilityBars({
  probabilities,
  eigenvectorLabels,
  basisColor,
  isNormalized,
  isMeasuring,
}: {
  probabilities: number[] | null;
  eigenvectorLabels: string[];
  basisColor: string;
  isNormalized: boolean | null;
  isMeasuring: boolean;
}) {
  if (!probabilities) {
    return (
      <div className="space-y-3">
        {eigenvectorLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-10 text-right">{label}</span>
            <div className="flex-1 h-6 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
        <p className="text-xs text-slate-600 text-center">选择量子态和测量基后显示概率分布</p>
      </div>
    );
  }

  const borderClass = isNormalized === false ? 'ring-1 ring-amber-500/50' : '';

  return (
    <div className={`space-y-3 p-3 rounded-lg ${borderClass}`}>
      {probabilities.map((prob, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-slate-300 w-10 text-right font-mono">
            {eigenvectorLabels[i]}
          </span>
          <div className="flex-1 h-6 rounded-full bg-white/5 overflow-hidden relative">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `${basisColor}cc` }}
              initial={{ width: 0 }}
              animate={{
                width: isMeasuring ? `${prob * 100}%` : `${prob * 100}%`,
                opacity: isMeasuring ? [1, 0.4, 1, 0.4, 1] : 1,
              }}
              transition={{
                width: { duration: 0.8, ease: 'easeOut' },
                opacity: isMeasuring
                  ? { duration: 0.6, repeat: 2, ease: 'easeInOut' }
                  : { duration: 0 },
              }}
            />
            {isMeasuring && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
          <span className="text-xs text-slate-300 w-14 text-right font-mono">
            {(prob * 100).toFixed(1)}%
          </span>
        </div>
      ))}
      {isNormalized === false && (
        <motion.p
          className="text-xs text-amber-400 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          ⚠ 概率之和 = {(probabilities.reduce((a, b) => a + b, 0)).toFixed(4)}，未归一
        </motion.p>
      )}
    </div>
  );
}
