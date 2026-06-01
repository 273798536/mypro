import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Overview from "@/pages/Overview"
import Detail from "@/pages/Detail"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/detail/:id" element={<Detail />} />
      </Routes>
    </Router>
  )
}
