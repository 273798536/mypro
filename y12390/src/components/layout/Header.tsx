import { useState } from 'react'
import { Menu, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const { toggleSidebar } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-semibold text-foreground">{title}</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline">张老师</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-xl">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">张老师</p>
                <p className="text-xs text-muted-foreground">电子音乐教室</p>
              </div>
              <div className="py-1">
                <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Settings className="h-4 w-4" />
                  设置
                </button>
                <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
