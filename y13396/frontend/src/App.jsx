import { Routes, Route, Link } from 'react-router-dom'
import VersionList from './pages/VersionList.jsx'
import VersionDetail from './pages/VersionDetail.jsx'
import SnapshotDetail from './pages/SnapshotDetail.jsx'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">📸</span>
            <span className="logo-text">影子流量版本快照</span>
          </Link>
          <nav className="nav-links">
            <Link to="/" className="nav-link">版本列表</Link>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<VersionList />} />
          <Route path="/version/:id" element={<VersionDetail />} />
          <Route path="/snapshot/:id" element={<SnapshotDetail />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
