import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainMenu from "@/pages/MainMenu";
import BuildPage from "@/pages/BuildPage";
import ReplayPlayer from "@/components/ReplayPlayer";

export default function App() {
  return (
    <Router>
      <ReplayPlayer />
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/build/:levelId?" element={<BuildPage />} />
      </Routes>
    </Router>
  );
}
