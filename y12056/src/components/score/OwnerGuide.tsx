import { motion } from 'framer-motion';
import { Search, Users, PlusCircle, BookOpen, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ErrorType } from '@/types/score';

interface OwnerGuideProps {
  errorType: ErrorType;
  onAction?: () => void;
}

const guideConfigs: Record<ErrorType, {
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: React.ReactNode;
  buttonText: string;
  buttonIcon: React.ReactNode;
}> = {
  missing_condition: {
    title: '条件缺失',
    description: '请仔细检查每个步骤是否引用了完整的必要条件。遗漏关键条件会导致推理不严谨。建议对照已知条件逐一核对。',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary',
    textColor: 'text-primary',
    icon: <Search className="w-6 h-6" />,
    buttonText: '开始自查',
    buttonIcon: <Search className="w-4 h-4" />,
  },
  wrong_lemma: {
    title: '引理错用',
    description: '引理的适用条件与当前问题不匹配。每个引理都有其特定的适用范围，建议找教练或老师核对引理的适用性。',
    bgColor: 'bg-accent-amber/5',
    borderColor: 'border-accent-amber',
    textColor: 'text-accent-amber',
    icon: <Lightbulb className="w-6 h-6" />,
    buttonText: '找教练核对',
    buttonIcon: <Users className="w-4 h-4" />,
  },
  counterexample_not_excluded: {
    title: '反例未排除',
    description: '存在未排除的反例，说明当前推理在某些特殊情况下不成立。请认真考虑边界情况和特殊取值，补录反例卡以排除。',
    bgColor: 'bg-accent-violet/5',
    borderColor: 'border-accent-violet',
    textColor: 'text-accent-violet',
    icon: <AlertTriangle className="w-6 h-6" />,
    buttonText: '补录反例',
    buttonIcon: <PlusCircle className="w-4 h-4" />,
  },
};

export default function OwnerGuide({ errorType, onAction }: OwnerGuideProps) {
  const config = guideConfigs[errorType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'relative rounded-xl border-2 p-6 shadow-card overflow-hidden',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10">
        <div className={cn('w-full h-full rounded-full', config.borderColor.replace('border-', 'bg-'))} />
      </div>

      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              'flex items-center justify-center w-14 h-14 rounded-xl',
              config.bgColor,
              config.textColor,
              config.borderColor,
              'border-2'
            )}
          >
            {config.icon}
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-neutral-slate" />
              <span className="text-xs text-neutral-slate font-medium uppercase tracking-wider">
                责任人指引
              </span>
            </div>

            <motion.h3
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className={cn('text-xl font-bold mb-3', config.textColor)}
            >
              {config.title}
            </motion.h3>

            <motion.p
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-neutral-slate text-sm leading-relaxed mb-5"
            >
              {config.description}
            </motion.p>

            <motion.button
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAction}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all',
                config.borderColor.replace('border-', 'bg-'),
                'text-white hover:opacity-90'
              )}
            >
              {config.buttonIcon}
              {config.buttonText}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
