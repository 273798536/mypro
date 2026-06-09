import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import Review from "@/pages/Review";
import Export from "@/pages/Export";

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen min-h-0 overflow-hidden text-ink-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/review" element={<Review />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
