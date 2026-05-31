import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Landmark, Users, TrendingDown, Shield, Scale, BookOpen, Play } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import type { Difficulty } from '@/types/game'
import { DIFFICULTY_CONFIGS } from '@/engine/projects'

const DIFFICULTY_LABELS: Record<Difficulty, { name: string; desc: string; icon: React.ReactNode }> = {
  easy: {
    name: '稳健起步',
    desc: `初始国库${DIFFICULTY_CONFIGS.easy.initialTreasury}万 · 债务${DIFFICULTY_CONFIGS.easy.initialDebt}万 · ${DIFFICULTY_CONFIGS.easy.maxTurns}回合`,
    icon: <Shield className="w-6 h-6" />,
  },
  normal: {
    name: '标准经营',
    desc: `初始国库${DIFFICULTY_CONFIGS.normal.initialTreasury}万 · 债务${DIFFICULTY_CONFIGS.normal.initialDebt}万 · ${DIFFICULTY_CONFIGS.normal.maxTurns}回合`,
    icon: <Scale className="w-6 h-6" />,
  },
  hard: {
    name: '债务危机',
    desc: `初始国库${DIFFICULTY_CONFIGS.hard.initialTreasury}万 · 债务${DIFFICULTY_CONFIGS.hard.initialDebt}万 · ${DIFFICULTY_CONFIGS.hard.maxTurns}回合`,
    icon: <TrendingDown className="w-6 h-6" />,
  },
}

const RULES = [
  { icon: <Landmark className="w-5 h-5 text-amber-400" />, title: '收入来源', desc: '每回合税收受基建投资和满意度影响。基建越多、满意度越高，税收越充裕。' },
  { icon: <TrendingDown className="w-5 h-5 text-red-400" />, title: '利息压力', desc: '每回合自动计息，债务攀升则利率上浮。最低偿还利息的50%，否则触发信用降级。' },
  { icon: <Users className="w-5 h-5 text-sky-400" />, title: '民生满意度', desc: '自然衰减每回合下降，民生支出可回复。满意度归零则社会动荡，游戏结束。' },
  { icon: <BookOpen className="w-5 h-5 text-purple-400" />, title: '项目风险', desc: '项目卡可能延期，延期后收益减半并扣罚。项目卡结论与债务走势矛盾时，满意度作为补充证据。' },
]

export default function Home() {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const startGame = useGameStore(s => s.startGame)
  const navigate = useNavigate()

  const handleStart = () => {
    startGame(difficulty)
    navigate('/game')
  }

  return (
    <div className="min-h-screen bg-[#0D1B1E] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #D4A843 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-[#D4A843] mb-3 tracking-wide" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          债务偿还经营赛
        </h1>
        <p className="text-slate-400 text-sm tracking-widest">DEBT REPAYMENT MANAGEMENT GAME</p>
        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-[#D4A843] to-transparent mx-auto mt-4" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 w-full max-w-3xl mb-10"
      >
        <div className="bg-[#1B2838]/80 border border-[#3A506B]/30 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-[#D4A843] text-lg font-semibold mb-4" style={{ fontFamily: '"Noto Serif SC", serif' }}>经营规则</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RULES.map((rule, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex gap-3 items-start"
              >
                <div className="mt-0.5 shrink-0">{rule.icon}</div>
                <div>
                  <div className="text-slate-200 text-sm font-medium">{rule.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed mt-0.5">{rule.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 w-full max-w-3xl mb-8"
      >
        <h2 className="text-[#D4A843] text-lg font-semibold mb-4 text-center" style={{ fontFamily: '"Noto Serif SC", serif' }}>选择难度</h2>
        <div className="grid grid-cols-3 gap-4">
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => {
            const info = DIFFICULTY_LABELS[d]
            const selected = difficulty === d
            return (
              <motion.button
                key={d}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setDifficulty(d)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer text-left ${
                  selected
                    ? 'border-[#D4A843] bg-[#D4A843]/10 shadow-lg shadow-[#D4A843]/10'
                    : 'border-[#3A506B]/30 bg-[#1B2838]/60 hover:border-[#3A506B]/60'
                }`}
              >
                <div className={`mb-2 ${selected ? 'text-[#D4A843]' : 'text-slate-500'}`}>{info.icon}</div>
                <div className={`text-sm font-semibold mb-1 ${selected ? 'text-[#D4A843]' : 'text-slate-300'}`}>{info.name}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{info.desc}</div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(212,168,67,0.3)' }}
        whileTap={{ scale: 0.95 }}
        onClick={handleStart}
        className="relative z-10 bg-[#D4A843] text-[#0D1B1E] px-10 py-3.5 rounded-lg font-bold text-lg flex items-center gap-2 cursor-pointer hover:bg-[#E0B85A] transition-colors shadow-lg shadow-[#D4A843]/20"
      >
        <Play className="w-5 h-5" />
        开始经营
      </motion.button>
    </div>
  )
}
