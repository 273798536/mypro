// 公交港湾容量复核系统 - 主布局组件
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  MapPin,
  Upload,
  AlertTriangle,
  Download,
  ChevronDown,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import useBusBayStore from '@/store';
import { cn } from '@/lib/utils';

// 菜单项配置
interface MenuItemConfig {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_ITEMS: MenuItemConfig[] = [
  { to: '/', label: '总览', icon: LayoutDashboard },
  { to: '/bays', label: '站点列表', icon: List },
  { to: '/bay-detail', label: '站点详情', icon: MapPin },
  { to: '/upload', label: '材料上传', icon: Upload },
  { to: '/anomalies', label: '异常中心', icon: AlertTriangle },
  { to: '/export', label: '导出中心', icon: Download },
];

export function AppLayout() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentUser = { name: '小赵', role: '规划师', avatar: '' };
  const navigate = useNavigate();

  // 处理菜单项点击（对于占位路由）
  const handleMenuClick = (to: string) => (e: React.MouseEvent) => {
    if (to === '/bay-detail') {
      // 站点详情为占位路由，暂时阻止跳转或跳转到默认详情
      e.preventDefault();
      // 如果需要跳转，可以使用 navigate 跳转到指定详情页
      // navigate('/bay/bay_001');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* ========== 顶部导航栏 ========== */}
      <header
        className="h-14 flex items-center justify-between px-6 text-white shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #34619C 100%)',
        }}
      >
        {/* 左侧品牌标识 */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚌</span>
          <h1 className="font-serif text-lg font-semibold tracking-wide">
            公交港湾容量复核系统
          </h1>
        </div>

        {/* 右侧用户信息 */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 hover:bg-white/10 active:bg-white/20"
          >
            {/* 用户头像 */}
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden border border-white/30">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<div class="w-full h-full flex items-center justify-center text-sm font-medium">${currentUser.name[0]}</div>`;
                }}
              />
            </div>
            {/* 用户名和角色 */}
            <div className="flex flex-col items-start text-left leading-tight">
              <span className="text-sm font-medium">{currentUser.name}</span>
              <span className="text-xs text-white/70">{currentUser.role}</span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-white/70 transition-transform duration-200',
                showUserMenu && 'rotate-180'
              )}
            />
          </button>

          {/* 用户下拉菜单 */}
          {showUserMenu && (
            <>
              {/* 遮罩层，点击关闭菜单 */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-20 overflow-hidden">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-prussia-50 hover:text-prussia-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  个人信息
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-prussia-50 hover:text-prussia-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  系统设置
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ========== 主体布局 ========== */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧侧边栏 */}
        <aside className="w-[220px] bg-white border-r border-slate-200 shadow-[2px_0_8px_rgba(15,23,42,0.04)] shrink-0 py-4">
          <nav className="flex flex-col gap-1 px-3">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={handleMenuClick(item.to)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-prussia-700 text-white shadow-md shadow-prussia-700/20'
                        : 'text-slate-600 hover:bg-prussia-50 hover:text-prussia-700'
                    )
                  }
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 shrink-0 transition-colors duration-200'
                    )}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* 右侧主内容区 */}
        <main className="flex-1 p-6 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
