import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import DataImportPage from './pages/DataImportPage';
import CalculatePage from './pages/CalculatePage';
import ValidatePage from './pages/ValidatePage';
import ReportPage from './pages/ReportPage';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getCurrentStep = () => {
    switch (location.pathname) {
      case '/': return 0;
      case '/calculate': return 1;
      case '/validate': return 2;
      case '/report': return 3;
      default: return 0;
    }
  };
  
  const handleStepChange = (step: number) => {
    switch (step) {
      case 0: navigate('/'); break;
      case 1: navigate('/calculate'); break;
      case 2: navigate('/validate'); break;
      case 3: navigate('/report'); break;
    }
  };
  
  return (
    <Layout currentStep={getCurrentStep()} onStepChange={handleStepChange}>
      <Routes>
        <Route path="/" element={<DataImportPage onNext={() => navigate('/calculate')} />} />
        <Route path="/calculate" element={<CalculatePage onNext={() => navigate('/validate')} onBack={() => navigate('/')} />} />
        <Route path="/validate" element={<ValidatePage onNext={() => navigate('/report')} onBack={() => navigate('/calculate')} />} />
        <Route path="/report" element={<ReportPage onBack={() => navigate('/validate')} />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return <AppContent />;
}
