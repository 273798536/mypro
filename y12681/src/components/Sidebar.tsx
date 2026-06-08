import { NavLink, useLocation } from 'react-router-dom';
import { Orbit, List, Plus, User } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';
import { useState } from 'react';

export default function Sidebar() {
  const location = useLocation();
  const currentUser = useSandboxStore((s) => s.currentUser);
  const setCurrentUser = useSandboxStore((s) => s.setCurrentUser);
  const [editingUser, setEditingUser] = useState(false);
  const [userInput, setUserInput] = useState(currentUser);

  const handleSaveUser = () => {
    if (userInput.trim()) {
      setCurrentUser(userInput.trim());
    } else {
      setUserInput(currentUser);
    }
    setEditingUser(false);
  };

  const navItems = [
    { to: '/', label: '沙盘列表', icon: List, exact: true },
    { to: '/create', label: '新建沙盘', icon: Plus, exact: true },
  ];

  return (
    <aside className="w-64 h-full bg-space-900/90 border-r border-space-700/60 flex flex-col starfield-bg">
      <div className="p-5 border-b border-space-700/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
            <Orbit className="w-6 h-6 text-space-900" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold text-gold-400 leading-tight">轨道倾角沙盘</h1>
            <p className="text-xs text-space-300 mt-0.5">舞台统筹工作台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30 shadow-gold'
                  : 'text-space-200 hover:bg-space-700/50 hover:text-gold-300 border border-transparent'
              }`}
            >
              <Icon className="w-4.5 h-4.5" strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-space-700/60">
        <div className="text-xs text-space-400 mb-2 uppercase tracking-wider">当前操作人</div>
        {editingUser ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveUser()}
              className="flex-1 px-2 py-1.5 text-sm bg-space-800 border border-space-600 rounded-md text-space-100 focus:outline-none focus:border-gold-500"
              autoFocus
            />
            <button
              onClick={handleSaveUser}
              className="px-2 py-1 text-xs bg-gold-500 text-space-900 rounded-md font-medium hover:bg-gold-400"
            >
              保存
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingUser(true)}
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-space-800/60 hover:bg-space-700/60 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-space-400 to-space-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-space-100" />
            </div>
            <span className="text-sm text-space-100 flex-1 truncate">{currentUser}</span>
            <span className="text-xs text-space-400 group-hover:text-gold-400 transition-colors">修改</span>
          </button>
        )}
      </div>
    </aside>
  );
}
