import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import TracePage from '@/pages/TracePage';
import InfluencePage from '@/pages/InfluencePage';
import CitationPage from '@/pages/CitationPage';
import VersionDiffPage from '@/pages/VersionDiffPage';
import ExportPage from '@/pages/ExportPage';
import OperatorPage from '@/pages/OperatorPage';
import NotFoundPage from '@/pages/NotFoundPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: (
      <AppLayout>
        <DashboardPage />
      </AppLayout>
    ),
  },
  {
    path: '/trace',
    element: (
      <AppLayout>
        <TracePage />
      </AppLayout>
    ),
  },
  {
    path: '/influence',
    element: (
      <AppLayout>
        <InfluencePage />
      </AppLayout>
    ),
  },
  {
    path: '/citation',
    element: (
      <AppLayout>
        <CitationPage />
      </AppLayout>
    ),
  },
  {
    path: '/version-diff',
    element: (
      <AppLayout>
        <VersionDiffPage />
      </AppLayout>
    ),
  },
  {
    path: '/export',
    element: (
      <AppLayout>
        <ExportPage />
      </AppLayout>
    ),
  },
  {
    path: '/operator',
    element: (
      <AppLayout>
        <OperatorPage />
      </AppLayout>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;
