import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import {
  LevelSelectPage,
  BridgeBuilderPage,
  SimulationPage,
  ComparisonPage,
  VersionManagerPage,
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<LevelSelectPage />} />
          <Route path="builder" element={<BridgeBuilderPage />} />
          <Route path="simulation" element={<SimulationPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="versions" element={<VersionManagerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
