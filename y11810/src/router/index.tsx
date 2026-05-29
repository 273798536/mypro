import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout/Layout';
import { useAuthStore } from '@/store/auth';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import ChannelPage from '@/pages/ChannelPage';
import ImpressionPage from '@/pages/data/ImpressionPage';
import ClickPage from '@/pages/data/ClickPage';
import ConversionPage from '@/pages/data/ConversionPage';
import SettlementRunPage from '@/pages/settlement/SettlementRunPage';
import SettlementRunDetailPage from '@/pages/settlement/SettlementRunDetailPage';
import ExceptionPage from '@/pages/ExceptionPage';
import BillPage from '@/pages/BillPage';
import BillDetailPage from '@/pages/BillDetailPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'channels',
        element: <ChannelPage />,
      },
      {
        path: 'data/impression',
        element: <ImpressionPage />,
      },
      {
        path: 'data/click',
        element: <ClickPage />,
      },
      {
        path: 'data/conversion',
        element: <ConversionPage />,
      },
      {
        path: 'settlement/runs',
        element: <SettlementRunPage />,
      },
      {
        path: 'settlement/runs/:id',
        element: <SettlementRunDetailPage />,
      },
      {
        path: 'exceptions',
        element: <ExceptionPage />,
      },
      {
        path: 'bills',
        element: <BillPage />,
      },
      {
        path: 'bills/:id',
        element: <BillDetailPage />,
      },
    ],
  },
]);
