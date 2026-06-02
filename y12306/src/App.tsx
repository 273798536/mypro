import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { DishList } from './pages/DishLibrary/DishList';
import { Optimizer } from './pages/Optimizer/Optimizer';
import { TraceCenter } from './pages/TraceCenter/TraceCenter';
import { Report } from './pages/Report/Report';
import { useDishStore } from './store/dishStore';
import { useOptimizerStore } from './store/optimizerStore';

export default function App() {
  const loadDishes = useDishStore((state) => state.loadDishes);
  const loadHistory = useOptimizerStore((state) => state.loadHistory);
  const isOptimizerLoaded = useOptimizerStore((state) => state.isLoaded);
  const dishes = useDishStore((state) => state.dishes);

  useEffect(() => {
    if (dishes.length === 0) {
      loadDishes();
    }
    if (!isOptimizerLoaded) {
      loadHistory();
    }
  }, [loadDishes, loadHistory, isOptimizerLoaded, dishes.length]);

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
