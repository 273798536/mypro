import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { FeedbackDetail } from "@/pages/FeedbackDetail";
import { Segments } from "@/pages/Segments";
import { Analytics } from "@/pages/Analytics";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/feedback/:id" element={<FeedbackDetail />} />
          <Route path="/segments" element={<Segments />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  );
}
