import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TopNav from "@/components/TopNav";
import GlobalEmergencyExit from "@/components/GlobalEmergencyExit";
import LandingPage from "@/pages/LandingPage";
import WorkbenchPage from "@/pages/WorkbenchPage";
import ScenarioPage from "@/pages/ScenarioPage";
import OutputPage from "@/pages/OutputPage";
import ReviewPage from "@/pages/ReviewPage";

export default function App() {
  return (
    <div className="min-h-screen bg-deepsea-50/30">
      <Router>
        <TopNav />
        <GlobalEmergencyExit />
        <Routes>
          <Route
            path="/"
            element={
              <main className="mx-auto max-w-[1400px] px-6 py-6">
                <LandingPage />
              </main>
            }
          />
          <Route
            path="/workbench"
            element={
              <main className="mx-auto max-w-[1680px] px-6 py-6">
                <WorkbenchPage />
              </main>
            }
          />
          <Route
            path="/scenario"
            element={
              <main className="mx-auto w-full px-4 py-4">
                <ScenarioPage />
              </main>
            }
          />
          <Route
            path="/output"
            element={
              <main className="mx-auto max-w-[1680px] px-6 py-6">
                <OutputPage />
              </main>
            }
          />
          <Route
            path="/review"
            element={
              <main className="mx-auto max-w-[1400px] px-6 py-6">
                <ReviewPage />
              </main>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

