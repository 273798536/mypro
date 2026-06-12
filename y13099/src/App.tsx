import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { RejudgeModal } from "@/components/common/RejudgeModal";
import { SensorDetailModal } from "@/components/common/SensorDetailModal";
import Home from "@/pages/Home";
import PlanDetail from "@/pages/PlanDetail";
import Exceptions from "@/pages/Exceptions";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan/:id" element={<PlanDetail />} />
          <Route path="/exceptions" element={<Exceptions />} />
          <Route
            path="*"
            element={
              <div className="p-12 text-center">
                <h2 className="text-xl font-semibold text-text mb-2">页面不存在</h2>
                <p className="text-sm text-muted">请通过导航访问其他页面</p>
              </div>
            }
          />
        </Routes>
      </Layout>
      <RejudgeModal />
      <SensorDetailModal />
    </Router>
  );
}
