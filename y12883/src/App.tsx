import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "@/components/Layout/MainLayout";
import Home from "@/pages/Home";
import Calculator from "@/pages/Calculator";
import BuoyData from "@/pages/BuoyData";
import Corrections from "@/pages/Corrections";
import Photos from "@/pages/Photos";
import RiskLevels from "@/pages/RiskLevels";

export default function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/buoy-data" element={<BuoyData />} />
          <Route path="/corrections" element={<Corrections />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/risk-levels" element={<RiskLevels />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}
