import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import App from '@/App';
import DashboardPage from '@/pages/DashboardPage';
import ConfidencePage from '@/pages/ConfidencePage';
import CorrectionPage from '@/pages/CorrectionPage';
import GrayComparePage from '@/pages/GrayComparePage';
import DistributionPage from '@/pages/DistributionPage';
import SafetyRulesPage from '@/pages/SafetyRulesPage';
import ExportPage from '@/pages/ExportPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'confidence', element: <ConfidencePage /> },
      { path: 'correction', element: <CorrectionPage /> },
      { path: 'gray-compare', element: <GrayComparePage /> },
      { path: 'distribution', element: <DistributionPage /> },
      { path: 'safety-rules', element: <SafetyRulesPage /> },
      { path: 'export', element: <ExportPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
