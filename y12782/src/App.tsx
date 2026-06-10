import { Routes, Route, NavLink, Outlet } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import BatchList from './pages/BatchList'
import BatchDetail from './pages/BatchDetail'
import BatchForm from './pages/BatchForm'
import SpectrumImport from './pages/SpectrumImport'
import AnomalyList from './pages/AnomalyList'
import AnomalyDetail from './pages/AnomalyDetail'
import ReportView from './pages/ReportView'

function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-lab-primary text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200">
          <h1 className="text-lg font-bold text-lab-primary leading-tight">
            实验室标准液<br />有效期管理
          </h1>
          <p className="text-xs text-slate-400 mt-1">Standard Validity Management</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/" end className={linkClass}>总览面板</NavLink>
          <NavLink to="/batches" className={linkClass}>标准液批次</NavLink>
          <NavLink to="/anomalies" className={linkClass}>异常记录</NavLink>
          <NavLink to="/spectrum/import" className={linkClass}>导入谱图</NavLink>
        </nav>
        <div className="p-4 border-t border-slate-200 text-xs text-slate-400">
          环境监测站 · 内部系统
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="batches" element={<BatchList />} />
        <Route path="batches/new" element={<BatchForm />} />
        <Route path="batches/:id" element={<BatchDetail />} />
        <Route path="batches/:id/edit" element={<BatchForm />} />
        <Route path="spectrum/import" element={<SpectrumImport />} />
        <Route path="anomalies" element={<AnomalyList />} />
        <Route path="anomalies/:id" element={<AnomalyDetail />} />
        <Route path="reports/:batchId" element={<ReportView />} />
      </Route>
    </Routes>
  )
}
