import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, AlertOctagon } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-industrial-50 via-white to-industrial-100 flex items-center justify-center p-8">
      <div className="text-center max-w-lg animate-fade-in-up">
        <div className="mb-8 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 bg-industrial-100 rounded-full opacity-50 animate-pulse-slow" />
          </div>
          <div className="relative flex items-center justify-center">
            <AlertOctagon className="w-16 h-16 text-industrial-300 absolute -top-4 -left-4 opacity-60" />
            <span className="text-9xl font-black text-industrial bg-gradient-to-br from-industrial-700 to-industrial-400 bg-clip-text text-transparent tracking-tight">
              404
            </span>
            <AlertOctagon className="w-16 h-16 text-industrial-300 absolute -bottom-4 -right-4 opacity-60" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">页面未找到</h1>
        <p className="text-gray-500 mb-2 text-lg">您访问的页面不存在或已被移除</p>
        <p className="text-gray-400 mb-10 text-sm">请检查链接是否正确，或返回仪表盘继续操作</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-industrial text-white rounded-xl hover:bg-industrial-800 transition-all duration-300 font-semibold shadow-glow-industrial hover:shadow-lg hover:-translate-y-0.5"
          >
            <LayoutDashboard className="w-5 h-5" />
            返回仪表盘
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-industrial border-2 border-industrial-200 rounded-xl hover:bg-industrial-50 hover:border-industrial-300 transition-all duration-300 font-semibold hover:-translate-y-0.5"
          >
            返回上一页
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            工业视觉人工改判质检平台 · Industrial Visual Inspection Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
