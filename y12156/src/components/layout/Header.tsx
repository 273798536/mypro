import { User, Bell, Settings, HelpCircle } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">建筑热桥损耗分析系统</h2>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-medium">
          专业版
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
          <HelpCircle className="w-5 h-5" />
        </button>
        <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-px h-8 bg-slate-200 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-800">节能顾问</p>
            <p className="text-xs text-slate-500">building@energy.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}
