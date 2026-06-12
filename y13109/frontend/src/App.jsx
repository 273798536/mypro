import { Routes, Route, NavLink } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import BatchDetailPage from './pages/BatchDetailPage.jsx'
import ReportPage from './pages/ReportPage.jsx'

export default function App() {
  return (
    <div className="app-container">
      <header className="header">
        <h1>📊 矩阵条件数批量验算系统</h1>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            批次列表
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/batch/:id" element={<BatchDetailPage />} />
          <Route path="/batch/:id/report" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  )
}
