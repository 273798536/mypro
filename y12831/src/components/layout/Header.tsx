import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dna, History, ListChecks, User } from 'lucide-react';
import { currentUser } from '@/data/samples';

const Header: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: '样本列表', icon: <ListChecks size={18} /> },
    { path: '/audit-log', label: '复核记录', icon: <History size={18} /> },
  ];
  
  return (
    <header className="bg-white border-b border-paper-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-deep-sea-600 flex items-center justify-center">
                <Dna className="text-white" size={22} />
              </div>
              <div>
                <h1 className="font-serif-sc text-lg font-semibold text-paper-900 leading-tight">
                  转录组样本分组复核系统
                </h1>
                <p className="text-xs text-paper-500 leading-tight">Transcriptome Sample Review System</p>
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-deep-sea-50 text-deep-sea-700'
                      : 'text-paper-600 hover:text-deep-sea-600 hover:bg-paper-50'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-paper-50">
              <div className="w-8 h-8 rounded-full bg-deep-sea-100 flex items-center justify-center text-deep-sea-700">
                <User size={16} />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-paper-800 leading-tight">{currentUser.name}</p>
                <p className="text-xs text-paper-500 leading-tight">
                  {currentUser.role === 'investigator' && '生态调查员'}
                  {currentUser.role === 'teacher' && '实验室老师'}
                  {currentUser.role === 'engineer' && '生物信息工程师'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
