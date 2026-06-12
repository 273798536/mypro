import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Workbench from '@/pages/Workbench';
import ReviewDetail from '@/pages/ReviewDetail';
import Timeline from '@/pages/Timeline';
import Materials from '@/pages/Materials';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Workbench />} />
          <Route path="/review/:recordId" element={<ReviewDetail />} />
          <Route path="/review" element={<ReviewLanding />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/materials" element={<Materials />} />
        </Route>
      </Routes>
    </Router>
  );
}

function ReviewLanding() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="text-center space-y-4">
        <p className="text-slate-400 text-lg">请从校验工作台选择一条记录进行复核</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
        >
          ← 返回工作台
        </a>
      </div>
    </div>
  );
}
