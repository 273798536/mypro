import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Report from "@/pages/Report";
import Admin from "@/pages/Admin";
import Compare from "@/pages/Compare";
import Changes from "@/pages/Changes";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/changes" element={<Changes />} />
        <Route path="*" element={
          <div className="min-h-screen bg-metro-bg flex items-center justify-center text-metro-text">
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-4">404</h2>
              <p className="text-metro-textMuted mb-6">页面不存在</p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2 bg-metro-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}
