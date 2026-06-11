import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import SceneReview from "@/pages/SceneReview";
import Annotations from "@/pages/Annotations";
import Export from "@/pages/Export";
import ToastContainer from "@/components/ToastContainer";

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-[#0D1117] text-zinc-100 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<SceneReview />} />
            <Route path="/annotations" element={<Annotations />} />
            <Route path="/export" element={<Export />} />
          </Routes>
        </main>
        <ToastContainer />
      </div>
    </Router>
  );
}
