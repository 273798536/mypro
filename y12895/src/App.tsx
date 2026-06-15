import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Trajectory from "@/pages/Trajectory"
import WaterQuality from "@/pages/WaterQuality"
import Corrections from "@/pages/Corrections"
import Photos from "@/pages/Photos"
import Results from "@/pages/Results"
import Composite from "@/pages/Composite"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trajectory" element={<Trajectory />} />
          <Route path="/water-quality" element={<WaterQuality />} />
          <Route path="/corrections" element={<Corrections />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/results" element={<Results />} />
          <Route path="/composite" element={<Composite />} />
        </Route>
      </Routes>
    </Router>
  )
}
