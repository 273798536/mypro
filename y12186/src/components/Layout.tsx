import type { ReactNode } from "react"
import Sidebar from "@/components/Sidebar"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-navy-800">
      <Sidebar />
      <main className="ml-60 flex-1 p-6">{children}</main>
    </div>
  )
}
