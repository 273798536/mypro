import React from 'react';
import { Stage3DView } from './components/Stage3DView';
import { Sidebar } from './components/Sidebar';

const App: React.FC = () => {
  return (
    <div className="w-full h-full flex overflow-hidden">
      <div className="flex-1 relative">
        <Stage3DView />
      </div>
      <Sidebar />
    </div>
  );
};

export default App;
