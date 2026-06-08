import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { ImportPage } from '@/pages/ImportPage';
import { TestPage } from '@/pages/TestPage';
import { RecordDetailPage } from '@/pages/RecordDetailPage';

function App() {
  return (
    <div className="h-full w-full bg-pocket-bg">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/record/:id" element={<RecordDetailPage />} />
      </Routes>
    </div>
  );
}

export default App;
