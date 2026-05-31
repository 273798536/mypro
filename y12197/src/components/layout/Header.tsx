import { Radio, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '@/store'

export default function Header() {
  const currentUser = useStore((s) => s.currentUser)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between bg-navy px-4 text-white">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5" />
        <span className="font-serif text-lg font-semibold">音乐电台歌单平衡器</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm">{currentUser}</span>
        <Link to="/settings" className="rounded p-1.5 hover:bg-white/10">
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}
