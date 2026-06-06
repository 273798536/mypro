import { Anchor, User, Bell, Settings, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Header() {
  const { currentUser } = useStore();

  return (
    <header className="h-16 bg-port-panel border-b border-port-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-port-deep flex items-center justify-center">
          <Anchor className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">港口泊位二维调度</h1>
          <p className="text-xs text-slate-400">Port Berth 2D Dispatch System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索泊位、材料、操作..."
            className="input-field pl-10 w-72 text-sm"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-port-border transition-colors">
          <Bell className="w-5 h-5 text-slate-300" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-port-warning rounded-full"></span>
        </button>

        <button className="p-2 rounded-lg hover:bg-port-border transition-colors">
          <Settings className="w-5 h-5 text-slate-300" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-port-border">
          <div className="w-9 h-9 rounded-full bg-port-deep flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{currentUser.name}</p>
            <p className="text-xs text-slate-400">
              {currentUser.role === 'supervisor' ? '车间主管' : '学生'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
