import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Workbench } from './pages/Workbench';
import { History } from './pages/History';
import { ReportPreview } from './components/ReportPreview';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-dark-900">
        <Routes>
          <Route
            path="/report/:id"
            element={<ReportPreview />}
          />
          <Route
            path="*"
            element={
              <>
                <Header />
                <Routes>
                  <Route path="/" element={<Workbench />} />
                  <Route path="/history" element={<History />} />
                </Routes>
              </>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
