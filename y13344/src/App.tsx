import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import SampleDetail from "./pages/SampleDetail"
import VersionCompare from "./pages/VersionCompare"
import Guide from "./pages/Guide"

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sample/:id" element={<SampleDetail />} />
        <Route path="/compare" element={<VersionCompare />} />
        <Route path="/guide" element={<Guide />} />
      </Route>
    </Routes>
  )
}
