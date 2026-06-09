import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import ConcentrationPage from './pages/ConcentrationPage';
import BalancePage from './pages/BalancePage';
import RecordsPage from './pages/RecordsPage';
import NewRecordPage from './pages/NewRecordPage';
import RecordDetailPage from './pages/RecordDetailPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">缓冲液配方计算器</div>
        <nav>
          <NavLink to="/concentration" className={({ isActive }) => isActive ? 'active' : ''}>
            浓度换算
          </NavLink>
          <NavLink to="/records" className={({ isActive }) => isActive ? 'active' : ''}>
            记录管理
          </NavLink>
          <NavLink to="/balance" className={({ isActive }) => isActive ? 'active' : ''}>
            配平计算
          </NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/concentration" replace />} />
          <Route path="/concentration" element={<ConcentrationPage />} />
          <Route path="/balance" element={<BalancePage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/new" element={<NewRecordPage />} />
          <Route path="/records/:id" element={<RecordDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
