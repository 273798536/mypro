import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ImportPage from './pages/ImportPage';
import FilterPage from './pages/FilterPage';
import DetailPage from './pages/DetailPage';
import SectionPage from './pages/SectionPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="import" element={<ImportPage />} />

        <Route path="filter" element={<FilterPage />} />
        <Route path="detail/:id" element={<DetailPage />} />
        <Route path="section" element={<SectionPage />} />
        <Route path="section/:recordId" element={<SectionPage />} />
      </Route>
    </Routes>
  );
}
