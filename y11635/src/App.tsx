import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Game } from './pages/Game';
import { Result } from './pages/Result';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
