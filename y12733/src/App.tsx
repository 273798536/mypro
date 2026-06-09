import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TopNav from "@/components/TopNav";
import ResultInterpretation from "@/pages/ResultInterpretation";
import ParamsManagement from "@/pages/ParamsManagement";
import ErrorAnalysis from "@/pages/ErrorAnalysis";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ResultInterpretation />} />
            <Route path="/params" element={<ParamsManagement />} />
            <Route path="/analysis" element={<ErrorAnalysis />} />
          </Routes>
        </main>
        <footer className="py-6 text-center text-xs text-ink-400 border-t border-ink-100 bg-white/40">
          条件概率教学卡 · 数据分析员日常工具 · 数据保存在浏览器本地
        </footer>
      </div>
    </Router>
  );
}
