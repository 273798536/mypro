import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import MistakeListPage from './pages/MistakeListPage'
import MistakeDetailPage from './pages/MistakeDetailPage'
import ImportPage from './pages/ImportPage'
import { MistakeProvider } from './hooks/useMistakeData'

function App() {
  return (
    <MistakeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/mistakes" replace />} />
          <Route path="/mistakes" element={<MistakeListPage />} />
          <Route path="/mistakes/:id" element={<MistakeDetailPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="*" element={<Navigate to="/mistakes" replace />} />
        </Routes>
      </Layout>
    </MistakeProvider>
  )
}

export default App
