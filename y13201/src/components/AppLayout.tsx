import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Toasts from './Toasts'

interface Props {
  children: ReactNode
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-64 min-h-screen">
        <div className="mx-auto w-full max-w-[1280px] px-8 py-8">{children}</div>
      </main>
      <Toasts />
    </div>
  )
}
