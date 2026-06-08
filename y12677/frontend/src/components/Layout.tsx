import { ReactNode } from 'react';
import Header from './Header';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7fa]">
      <Header />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="bg-white border-t border-border-light py-4 text-center text-sm text-text-gray">
        隧道管片错缝模型工作台 &copy; 2026
      </footer>
    </div>
  );
}
