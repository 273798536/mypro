import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkspaceLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
