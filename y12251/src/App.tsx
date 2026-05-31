import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "@/pages/Home"
import Race from "@/pages/Race"
import Anomalies from "@/pages/Anomalies"
import Review from "@/pages/Review"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/race/:id" element={<Race />} />
        <Route path="/anomalies" element={<Anomalies />} />
        <Route path="/review/:id" element={<Review />} />
      </Routes>
    </Router>
  )
}
