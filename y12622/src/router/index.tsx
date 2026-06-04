import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Dashboard from '../pages/Dashboard';
import EquipmentList from '../pages/EquipmentList';
import EquipmentDetail from '../pages/EquipmentDetail';
import ImageImport from '../pages/ImageImport';
import ImageAnnotate from '../pages/ImageAnnotate';
import Charts from '../pages/Charts';
import Export from '../pages/Export';
import TraceView from '../pages/TraceView';
import UserGuide from '../pages/UserGuide';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'equipment',
        element: <EquipmentList />,
      },
      {
        path: 'equipment/:id',
        element: <EquipmentDetail />,
      },
      {
        path: 'import',
        element: <ImageImport />,
      },
      {
        path: 'annotate/:processingId',
        element: <ImageAnnotate />,
      },
      {
        path: 'charts',
        element: <Charts />,
      },
      {
        path: 'export',
        element: <Export />,
      },
      {
        path: 'trace/:anomalyId',
        element: <TraceView />,
      },
      {
        path: 'guide',
        element: <UserGuide />,
      },
    ],
  },
]);

export default router;
