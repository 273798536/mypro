import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { VersionHeader } from './VersionHeader';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-deep-blue-500">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <VersionHeader />
        <main className="flex-1 overflow-y-auto scrollbar-thin data-grid">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
