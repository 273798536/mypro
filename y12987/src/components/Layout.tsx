import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import { useAppStore } from '@/store/useAppStore'

export default function Layout() {
  const { sidebarCollapsed } = useAppStore()
  const location = useLocation()
  const isTopology = location.pathname === '/'

  return (
    <div className={isTopology ? 'h-screen flex flex-col' : 'min-h-screen'}>
      <Sidebar />
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        } ${isTopology ? 'flex-1 overflow-hidden' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  )
}
