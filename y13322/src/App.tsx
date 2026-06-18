import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { Workbench } from '@/pages/Workbench'
import { Analytics } from '@/pages/Analytics'
import { Ledger } from '@/pages/Ledger'
import { OverwriteGuard } from '@/components/OverwriteGuard'

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/workbench" replace />} />
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="*" element={<Navigate to="/workbench" replace />} />
      </Routes>
      <OverwriteGuard />
    </AppLayout>
  )
}
