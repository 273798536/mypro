import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import History from './pages/History'
import Diagnosis from './pages/Diagnosis'
import Export from './pages/Export'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/records" element={<Records />} />
        <Route path="/history" element={<History />} />
        <Route path="/diagnosis" element={<Diagnosis />} />
        <Route path="/export" element={<Export />} />
      </Routes>
    </Layout>
  )
}

export default App
