import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Workbench from '@/pages/Workbench';
import Calculator from '@/pages/Calculator';
import ImageAnnotation from '@/pages/ImageAnnotation';
import QcWorkflow from '@/pages/QcWorkflow';
import EdgeCases from '@/pages/EdgeCases';
import Comparison from '@/pages/Comparison';

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-warm-50">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<Workbench />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/image-annotation" element={<ImageAnnotation />} />
              <Route path="/qc-workflow" element={<QcWorkflow />} />
              <Route path="/edge-cases" element={<EdgeCases />} />
              <Route path="/comparison" element={<Comparison />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
