import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CanvasPage } from '@/pages/CanvasPage';
import { ImportPage } from '@/pages/ImportPage';
import { ReportPage } from '@/pages/ReportPage';
import { ExportPage } from '@/pages/ExportPage';

const router = createBrowserRouter([
  { path: '/', element: <CanvasPage /> },
  { path: '/import', element: <ImportPage /> },
  { path: '/report', element: <ReportPage /> },
  { path: '/export', element: <ExportPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
