import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { mockCurrentUser } from '@/data/mockData'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar currentUser={mockCurrentUser} />
      <main className="ml-64 flex-1 bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
