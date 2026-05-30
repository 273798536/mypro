import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, AlertOctagon, CheckCircle, X, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HintType = 'missing-condition' | 'wrong-lemma' | 'counterexample' | 'success';

export interface Hint {
  type: HintType;
  message: string;
  guide?: string;
}

interface RealTimeHintProps {
  hints: Hint[];
  visible: boolean;
}

const hintConfig: Record<HintType, {
  icon: React.ElementType;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  label: string;
}> = {
  'missing-condition': {
    icon: AlertTriangle,
    bgColor: 'bg-accent-amber/10',
    borderColor: 'border-accent-amber/30',
    textColor: 'text-accent-amber',
    iconColor: 'text-accent-amber',
    label: '待确认',
  },
  'wrong-lemma': {
    icon: XCircle,
    bgColor: 'bg-accent-rose/10',
    borderColor: 'border-accent-rose/30',
    textColor: 'text-accent-rose',
    iconColor: 'text-accent-rose',
    label: '找教练核对',
  },
  'counterexample': {
    icon: AlertOctagon,
    bgColor: 'bg-accent-violet/10',
    borderColor: 'border-accent-violet/30',
    textColor: 'text-accent-violet',
    iconColor: 'text-accent-violet',
    label: '反例预警',
  },
  'success': {
    icon: CheckCircle,
    bgColor: 'bg-accent-emerald/10',
    borderColor: 'border-accent-emerald/30',
    textColor: 'text-accent-emerald',
    iconColor: 'text-accent-emerald',
    label: '条件满足',
  },
};

export default function RealTimeHint({ hints, visible }: RealTimeHintProps) {
  if (!visible || hints.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-6 right-6 z-50 w-80 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-ink">
          <Lightbulb className="w-4 h-4 text-accent-amber" />
          <span>实时提示</span>
        </div>
        <span className="text-xs text-neutral-slate">
          {hints.length} 条提示
        </span>
      </div>

      <AnimatePresence>
        {hints.map((hint, index) => {
          const config = hintConfig[hint.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={`${hint.type}-${index}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ duration: 0.25, delay: index * 0.1 }}
              className={cn(
                'relative rounded-xl border p-4 shadow-card backdrop-blur-sm',
                config.bgColor,
                config.borderColor
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('flex-shrink-0 p-1.5 rounded-lg bg-white/50', config.iconColor)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', config.bgColor, config.textColor)}>
                      {config.label}
                    </span>
                  </div>
                  <p className={cn('text-sm font-medium mb-1', config.textColor)}>
                    {hint.message}
                  </p>
                  {hint.guide && (
                    <p className="text-xs text-neutral-slate/80 leading-relaxed">
                      {hint.guide}
                    </p>
                  )}
                </div>
                <button className="flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors text-neutral-slate/60 hover:text-neutral-ink">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <motion.div
                className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                style={{ backgroundColor: 'currentColor' }}
                initial={{ height: 0 }}
                animate={{ height: '100%' }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {hints.some((h) => h.type === 'success') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <span className="text-xs text-accent-emerald font-medium">
            ✓ 继续保持！
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
