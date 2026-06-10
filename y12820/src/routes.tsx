import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import SampleList from './pages/Samples/SampleList';
import QualityControl from './pages/QualityControl/QualityControl';
import DifferentialAnalysis from './pages/DifferentialAnalysis/DifferentialAnalysis';
import Reports from './pages/Reports/Reports';
import TestScenarios from './pages/TestScenarios/TestScenarios';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'samples',
        element: <SampleList />,
      },
      {
        path: 'quality-control',
        element: <QualityControl />,
      },
      {
        path: 'differential-analysis',
        element: <DifferentialAnalysis />,
      },
      {
        path: 'reports',
        element: <Reports />,
      },
      {
        path: 'test-scenarios',
        element: <TestScenarios />,
      },
    ],
  },
]);
