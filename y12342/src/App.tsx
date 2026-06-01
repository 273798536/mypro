import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ImportPage from './pages/ImportPage'
import AnalysisPage from './pages/AnalysisPage'
import DetailPage from './pages/DetailPage'
import ExportPage from './pages/ExportPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ImportPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/detail/:id" element={<DetailPage />} />
        <Route path="/export" element={<ExportPage />} />
      </Routes>
    </Layout>
  )
}

export default App
