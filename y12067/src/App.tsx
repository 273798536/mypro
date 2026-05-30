import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScenarioSelect from "@/pages/ScenarioSelect";
import GamePage from "@/pages/GamePage";
import ResultPage from "@/pages/ResultPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScenarioSelect />} />
        <Route path="/game/:scenarioId" element={<GamePage />} />
        <Route path="/result/:scenarioId" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}
