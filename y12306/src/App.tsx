import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { DishList } from './pages/DishLibrary/DishList';
import { Optimizer } from './pages/Optimizer/Optimizer';
import { TraceCenter } from './pages/TraceCenter/TraceCenter';
import { Report } from './pages/Report/Report';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dishes" element={<DishList />} />
          <Route path="/optimizer" element={<Optimizer />} />
          <Route path="/trace" element={<TraceCenter />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </Router>
  );
}
