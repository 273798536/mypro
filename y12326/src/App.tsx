import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Workbench from "@/pages/Workbench"
import Importance from "@/pages/Importance"
import Diagnosis from "@/pages/Diagnosis"
import Report from "@/pages/Report"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workbench />} />
          <Route path="/importance" element={<Importance />} />
          <Route path="/diagnosis" element={<Diagnosis />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </Router>
  )
}
