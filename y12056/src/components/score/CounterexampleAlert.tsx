import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Ban, PlusCircle, Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Counterexample } from '@/types/game';

interface CounterexampleAlertProps {
  counterexample: Counterexample;
  affectedSteps: string[];
  onExclude?: () => void;
  onAddCounterexample?: () => void;
}

export default function CounterexampleAlert({
  counterexample,
  affectedSteps,
  onExclude,
  onAddCounterexample,
}: CounterexampleAlertProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-xl border-2 border-accent-rose bg-accent-rose/5 p-5',
        'shadow-card overflow-hidden'
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent-rose/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="relative">
            <motion.div
              animate={{ rotate: isHovered ? 360 : 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
            >
              <Hexagon className="w-12 h-12 text-accent-rose fill-accent-rose/10" />
            </motion.div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-accent-rose">
              反例
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-accent-rose" />
              <h4 className="font-semibold text-accent-rose">发现反例</h4>
            </div>

            <p className="text-neutral-ink font-serif mb-3">
              {counterexample.content}
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm text-neutral-slate">受影响步骤：</span>
              {affectedSteps.map((step, idx) => (
                <motion.span
                  key={step}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  className="px-2 py-0.5 rounded-full bg-accent-rose/10 text-accent-rose text-xs font-medium"
                >
                  步骤 {step}
                </motion.span>
              ))}
            </div>

            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: isHovered ? 'auto' : 0,
                opacity: isHovered ? 1 : 0
              }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onExclude}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-rose text-white text-sm font-medium hover:bg-accent-rose/90 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  排除反例
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onAddCounterexample}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-accent-rose text-accent-rose text-sm font-medium hover:bg-accent-rose/10 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  补录反例卡
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
