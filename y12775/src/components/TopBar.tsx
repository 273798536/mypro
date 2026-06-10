import { useLocation } from 'react-router-dom';
import { Shield, Bell, User } from 'lucide-react';

const titleMap: Record<string, string> = {
  '/': '计算工作台',
  '/reagent': '试剂台账',
  '/batch': '批次追踪',
  '/results': '结果总览',
};

function TopBar() {
  const location = useLocation();
  const title = titleMap[location.pathname] || '晶体水含量计算';

  return (
    <header className="h-16 shrink-0 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 font-serif">{title}</h2>
        <p className="text-xs text-slate-400">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-status-passBg rounded-full">
          <Shield className="w-3.5 h-3.5 text-status-pass" />
          <span className="text-xs font-medium text-status-pass">系统正常</span>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-fail rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-4 h-4 text-primary-700" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700 leading-tight">实验人员</p>
            <p className="text-[10px] text-slate-400">课题组 A 组</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
