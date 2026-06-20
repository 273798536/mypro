import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import App from './App.jsx';
import TaskList from './pages/TaskList.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import TaskCompare from './pages/TaskCompare.jsx';
import HandoverCard from './pages/HandoverCard.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<TaskList />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="tasks/:id/compare" element={<TaskCompare />} />
          <Route path="tasks/:id/handover" element={<HandoverCard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
