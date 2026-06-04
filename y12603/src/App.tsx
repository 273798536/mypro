import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import LayerManager from "@/pages/LayerManager"
import CanvasEditor from "@/pages/CanvasEditor"
import StudentView from "@/pages/StudentView"
import DefectList from "@/pages/DefectList"
import DefectDetail from "@/pages/DefectDetail"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LayerManager />} />
          <Route path="/canvas/:workshopId" element={<CanvasEditor />} />
          <Route path="/defects/:workshopId" element={<DefectList />} />
          <Route path="/defects/:workshopId/:defectId" element={<DefectDetail />} />
        </Route>
        <Route path="/student/:workshopId" element={<StudentView />} />
      </Routes>
    </Router>
  )
}
