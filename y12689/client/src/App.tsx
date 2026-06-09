import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'
import RecordListPage from './pages/RecordListPage'
import RecordDetailPage from './pages/RecordDetailPage'

function App() {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/records" replace />} />
            <Route path="/records" element={<RecordListPage />} />
            <Route path="/records/:id" element={<RecordDetailPage />} />
          </Routes>
        </main>
      </div>
      <StatusBar />
    </div>
  )
}

export default App
