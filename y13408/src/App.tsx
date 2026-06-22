import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Review from "@/pages/Review"
import Anomalies from "@/pages/Anomalies"
import Export from "@/pages/Export"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/anomalies" element={<Anomalies />} />
          <Route path="/export" element={<Export />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
