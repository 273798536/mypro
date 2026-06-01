import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/common/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { Samples } from '@/pages/Samples';
import { Tracks } from '@/pages/Tracks';
import { Licenses } from '@/pages/Licenses';
import { Trace } from '@/pages/Trace';
import { Compare } from '@/pages/Compare';
import { Export } from '@/pages/Export';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-primary">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/samples/:id" element={<Samples />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/tracks/:id" element={<Tracks />} />
          <Route path="/licenses" element={<Licenses />} />
          <Route path="/licenses/:id" element={<Licenses />} />
          <Route path="/trace" element={<Trace />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
