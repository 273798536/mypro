import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import PlaybackList from "@/pages/PlaybackList";
import PlaybackDetail from "@/pages/PlaybackDetail";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<PlaybackList />} />
          <Route path="/playback/:id" element={<PlaybackDetail />} />
        </Routes>
      </Layout>
    </Router>
  );
}
