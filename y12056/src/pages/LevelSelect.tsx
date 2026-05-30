import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Lock, CheckCircle2, Play, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { levels } from '@/data/levels';
import type { Level } from '@/types/game';

interface LevelProgress {
  bestScore: number;
  completed: boolean;
  attempts: number;
}

const difficultyConfig = {
  easy: { label: '入门', color: 'bg-accent-emerald', textColor: 'text-accent-emerald', borderColor: 'border-accent-emerald' },
  medium: { label: '进阶', color: 'bg-primary', textColor: 'text-primary', borderColor: 'border-primary' },
  hard: { label: '挑战', color: 'bg-accent-violet', textColor: 'text-accent-violet', borderColor: 'border-accent-violet' },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

function LevelCard({ level, progress, index }: { level: Level; progress: LevelProgress; index: number }) {
  const navigate = useNavigate();
  const config = difficultyConfig[level.difficulty];
  const isUnlocked = index === 0 || levels[index - 1] !== undefined;

  const handleClick = () => {
    if (isUnlocked) {
      navigate(`/game/${level.id}`);
    }
  };

  return (
    <motion.div
      variants={item}
      whileHover={isUnlocked ? { y: -8, scale: 1.02 } : {}}
      whileTap={isUnlocked ? { scale: 0.98 } : {}}
      onClick={handleClick}
      className={cn(
        'relative w-full max-w-sm rounded-2xl border-2 bg-white shadow-card overflow-hidden transition-all duration-300',
        isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
        config.borderColor
      )}
    >
      <div className={cn('absolute top-0 left-0 right-0 h-2', config.color)} />

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className={cn('px-3 py-1 rounded-full text-xs font-semibold text-white', config.color)}>
            {config.label}
          </span>
          {!isUnlocked && (
            <Lock className="w-5 h-5 text-neutral-slate" />
          )}
          {progress.completed && (
            <CheckCircle2 className="w-5 h-5 text-accent-emerald" />
          )}
        </div>

        <h3 className="text-xl font-bold font-serif text-neutral-ink mb-2">
          {level.title}
        </h3>

        <p className="text-sm text-neutral-slate mb-4 font-serif leading-relaxed">
          已知：{level.knownConditions.join('、')}
          <br />
          求证：{level.toProve}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-ivory">
          <div className="flex items-center gap-2">
            <Trophy className={cn('w-4 h-4', progress.bestScore > 0 ? config.textColor : 'text-neutral-slate/40')} />
            <span className="text-sm text-neutral-slate">
              最高分：<span className={cn('font-semibold', progress.bestScore > 0 ? config.textColor : 'text-neutral-slate/40')}>
                {progress.bestScore > 0 ? `${progress.bestScore}分` : '未尝试'}
              </span>
            </span>
          </div>
          {progress.attempts > 0 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(progress.attempts, 5) }).map((_, i) => (
                <Star key={i} className="w-3 h-3 text-accent-amber fill-accent-amber" />
              ))}
            </div>
          )}
        </div>

        {isUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="flex items-center justify-center gap-2 text-white font-medium">
              <Play className="w-4 h-4" />
              开始挑战
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function LevelSelect() {
  const levelProgress = useMemo<LevelProgress[]>(() => {
    return levels.map(() => ({
      bestScore: Math.floor(Math.random() * 50) + 50,
      completed: Math.random() > 0.5,
      attempts: Math.floor(Math.random() * 3) + 1,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-ivory via-white to-primary/5">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            交互式数学证明学习平台
          </div>
          <h1 className="text-5xl font-bold font-serif text-neutral-ink mb-4">
            数学证明拼板
          </h1>
          <p className="text-lg text-neutral-slate max-w-2xl mx-auto font-serif leading-relaxed">
            通过拖拽条件卡和引理卡，构建完整的逻辑推理链，
            <br className="hidden md:block" />
            培养严谨的数学思维和证明能力
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center"
        >
          {levels.map((level, index) => (
            <LevelCard
              key={level.id}
              level={level}
              progress={levelProgress[index]}
              index={index}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-6 p-6 rounded-2xl bg-white border-2 border-neutral-ivory shadow-card">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{levels.length}</div>
              <div className="text-sm text-neutral-slate">精选关卡</div>
            </div>
            <div className="w-px h-12 bg-neutral-ivory" />
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-emerald">3</div>
              <div className="text-sm text-neutral-slate">难度分级</div>
            </div>
            <div className="w-px h-12 bg-neutral-ivory" />
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-violet">∞</div>
              <div className="text-sm text-neutral-slate">学习可能</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
