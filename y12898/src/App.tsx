import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import TidalCalculation from "@/pages/TidalCalculation"
import DataReview from "@/pages/DataReview"
import Report from "@/pages/Report"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TidalCalculation />} />
          <Route path="/review" element={<DataReview />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </Router>
  )
}
