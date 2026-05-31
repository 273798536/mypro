import { useNavigate } from 'react-router-dom'
import { cases } from '@/data/cases'
import { useGameStore } from '@/store/gameStore'
import { Shield, Search, Trophy, Clock, ChevronRight } from 'lucide-react'

export default function CaseHall() {
  const navigate = useNavigate()
  const completedCases = useGameStore(s => s.completedCases)

  const completedCount = Object.keys(completedCases).length
  const totalScore = Object.values(completedCases).reduce((sum, c) => sum + c.score, 0)
  const avgAccuracy = completedCount > 0 ? Math.round(totalScore / completedCount) : 0

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-[#f5f0e8]">
      <header className="w-full bg-[#0f1219] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-[#d4a843]" />
          <h1 className="text-xl font-bold text-[#d4a843] tracking-wide">保险理赔侦探局</h1>
          <Search className="w-4 h-4 text-[#d4a843]/40 ml-1" />
        </div>
        <div className="flex items-center gap-4 text-sm text-[#f5f0e8]/70">
          <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-[#d4a843]" />已结案 {completedCount}/{cases.length}</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-[#d4a843]" />正确率 {avgAccuracy}%</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-center text-[#f5f0e8]/60 mb-8 max-w-2xl mx-auto leading-relaxed">
          审查保单、病历、发票与条款，识破等待期陷阱、发票重复与条款过期，成为顶尖理赔侦探。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cases.map(c => {
            const result = completedCases[c.id]
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/case/${c.id}`)}
                className="group relative bg-[#0f1219] border border-[#f5f0e8]/10 rounded-lg p-5 cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:border-[#d4a843]/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-semibold text-[#f5f0e8] group-hover:text-[#d4a843] transition-colors">{c.title}</h2>
                  <ChevronRight className="w-5 h-5 text-[#f5f0e8]/20 group-hover:text-[#d4a843] transition-colors" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#d4a843] text-sm tracking-wider">
                    {Array.from({ length: 3 }, (_, i) => i < c.difficulty ? '★' : '☆').join('')}
                  </span>
                  <span className="text-xs text-[#f5f0e8]/40">
                    {c.difficulty === 1 ? '初级' : c.difficulty === 2 ? '中级' : '高级'}
                  </span>
                </div>

                <p className="text-sm text-[#f5f0e8]/50 line-clamp-2 mb-3">{c.description}</p>

                {result ? (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="bg-[#d4a843]/20 text-[#d4a843] px-2 py-0.5 rounded">
                      得分 {result.score}
                    </span>
                    <span className="text-[#f5f0e8]/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />用时 {result.timeUsed}s
                    </span>
                  </div>
                ) : (
                  <span className="text-xs bg-[#f5f0e8]/10 text-[#f5f0e8]/50 px-2 py-0.5 rounded">待审查</span>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <footer className="w-full bg-[#0f1219] text-center py-4 text-xs text-[#f5f0e8]/30">
        保险理赔侦探局 © 2025
      </footer>
    </div>
  )
}
