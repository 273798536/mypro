import { List } from 'lucide-react'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen">
      <aside
        className="flex flex-col bg-[#0f3460] text-white"
        style={{ width: 220 }}
      >
        <div className="px-5 py-5 border-b border-white/10">
          <h1 className="text-base font-semibold leading-tight">
            企业年金缴费异常回放
          </h1>
        </div>

        <nav className="flex-1 py-3">
          <a
            href="/"
            className="flex items-center gap-2.5 px-5 py-2.5 text-sm bg-white/10 font-medium"
          >
            <List size={18} strokeWidth={2} />
            异常回放列表
          </a>
        </nav>
      </aside>

      <main className="flex-1 p-6" style={{ padding: 24 }}>
        {children}
      </main>
    </div>
  )
}
