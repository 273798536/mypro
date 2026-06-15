import { NavLink } from 'react-router-dom'
import { LayoutGrid, ImagePlus } from 'lucide-react'

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 lg:w-56 bg-inkstone text-parchment flex flex-col z-50 transition-all">
      <div className="p-4 lg:px-5 lg:py-6 border-b border-white/10">
        <h1 className="hidden lg:block font-serif text-lg font-semibold leading-tight">版权授权<br />分账对齐</h1>
        <span className="lg:hidden text-lg font-serif font-semibold">版</span>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 lg:px-5 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-parchment/70 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <LayoutGrid size={18} />
          <span className="hidden lg:inline">分账对齐总览</span>
        </NavLink>
        <NavLink
          to="/screenshot/new"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 lg:px-5 py-2.5 text-sm transition-colors ${
              isActive ? 'bg-white/15 text-white' : 'text-parchment/70 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <ImagePlus size={18} />
          <span className="hidden lg:inline">排练群截图录入</span>
        </NavLink>
      </nav>

      <div className="p-4 lg:px-5 border-t border-white/10">
        <p className="hidden lg:block text-xs text-parchment/50">琴房前台 · 小温</p>
        <div className="lg:hidden w-2 h-2 rounded-full bg-sage mx-auto" />
      </div>
    </aside>
  )
}
