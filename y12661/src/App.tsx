import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom"
import TaskList from "@/pages/TaskList"
import ReviewDetail from "@/pages/ReviewDetail"
import HistoryPage from "@/pages/HistoryPage"
import ExportPage from "@/pages/ExportPage"
import { TopNav } from "@/components/ui/TopNav"

function Shell() {
  const location = useLocation()
  const showNav = true
  return (
    <div className="h-screen flex flex-col bg-eng-bg text-eng-text">
      {showNav && <TopNav />}
      <div className="flex-1 min-h-0 overflow-hidden" key={location.pathname}>
        <Routes>
          <Route path="/" element={<TaskList />} />
          <Route path="/review/:id" element={<ReviewDetail />} />
          <Route path="/review/:id/history" element={<HistoryPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center h-full font-mono text-eng-muted">
                404 · 页面不存在
              </div>
            }
          />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Shell />
    </Router>
  )
}
