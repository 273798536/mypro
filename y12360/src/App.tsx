import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Workspace from "@/pages/Workspace"
import Records from "@/pages/Records"
import RecordDetail from "@/pages/RecordDetail"
import Export from "@/pages/Export"

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Workspace />} />
          <Route path="/records" element={<Records />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </Layout>
    </Router>
  )
}
