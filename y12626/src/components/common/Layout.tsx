import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-xuan-50 flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <footer className="bg-xuan-100 border-t border-ochre-300 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-ochre-600">
          <p className="font-serif">
            地图等高线临摹器 · 文保轨迹复核系统 · 仅供内部使用
          </p>
          <p>
            © 2024 文化遗产保护数字化平台
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
