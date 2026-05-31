import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Orders from '@/pages/Orders'
import Reconciliation from '@/pages/Reconciliation'
import Exceptions from '@/pages/Exceptions'
import AuditTrail from '@/pages/AuditTrail'
import Reports from '@/pages/Reports'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'

function AppLayout() {
  const { sidebarCollapsed } = useAppStore()

  return (
    <div className="min-h-screen bg-[#F4F6FA]">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        )}
      >
        <div className="p-6 max-w-[1400px]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/exceptions" element={<Exceptions />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}
