import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import Game from './pages/Game';
import Result from './pages/Result';
import Replay from './pages/Replay';
import Admin from './pages/Admin';
import AdminImport from './pages/AdminImport';
import History from './pages/History';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/game',
        element: <Game />,
      },
      {
        path: '/result',
        element: <Result />,
      },
      {
        path: '/replay/:recordId',
        element: <Replay />,
      },
      {
        path: '/admin',
        element: <Admin />,
      },
      {
        path: '/admin/import',
        element: <AdminImport />,
      },
      {
        path: '/history',
        element: <History />,
      },
    ],
  },
]);
