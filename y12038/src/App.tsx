import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LevelSelect from "@/pages/LevelSelect";
import Simulation from "@/pages/Simulation";
import Review from "@/pages/Review";
import { useEffect } from "react";
import { useGameStore, getLevelConfig } from "@/store/gameStore";

function SimWrapper() {
  const levelId = window.location.pathname.split("/simulate/")[1] ?? "";
  const dispatch = useGameStore((s) => s.dispatch);
  const storeLevelId = useGameStore((s) => s.levelId);

  useEffect(() => {
    if (storeLevelId !== levelId) {
      const config = getLevelConfig(levelId);
      if (config) {
        dispatch({ type: "START_LEVEL", config });
      }
    }
  }, [levelId, storeLevelId, dispatch]);

  return <Simulation />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/simulate/:levelId" element={<SimWrapper />} />
        <Route path="/review/:levelId" element={<Review />} />
      </Routes>
    </Router>
  );
}
