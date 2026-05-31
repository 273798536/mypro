import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Matches from "./pages/Matches";
import SongDetail from "./pages/SongDetail";
import Conflicts from "./pages/Conflicts";
import Review from "./pages/Review";
import History from "./pages/History";
import Export from "./pages/Export";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/song/:id" element={<SongDetail />} />
            <Route path="/conflicts" element={<Conflicts />} />
            <Route path="/review" element={<Review />} />
            <Route path="/history" element={<History />} />
            <Route path="/export" element={<Export />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
