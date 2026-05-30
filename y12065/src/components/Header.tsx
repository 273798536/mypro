import { Search, Trophy, FileText } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { Link } from 'react-router-dom'

const Header = () => {
  const { totalScore, solvedCases } = useGameStore()

  return (
    <header className="sticky top-0 z-50 bg-primary-800/95 backdrop-blur-sm border-b border-accent-gold/30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-accent-gold flex items-center justify-center group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5 text-primary-800" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold text-accent-gold">
              乐理和弦侦探
            </h1>
            <p className="text-xs text-primary-200">Chord Detective</p>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-primary-100">
            <Trophy className="w-5 h-5 text-accent-gold" />
            <span className="text-sm">
              已破案件：<span className="font-bold text-accent-gold">{solvedCases.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-primary-100">
            <FileText className="w-5 h-5 text-accent-gold" />
            <span className="text-sm">
              总积分：<span className="font-bold text-accent-gold">{totalScore}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
