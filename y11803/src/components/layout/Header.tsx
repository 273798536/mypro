import { useLocation, Link } from 'react-router-dom';
import { RefreshCw, User, ChevronRight, Home } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const routeTitles: Record<string, string> = {
  '/': '退款单列表',
  '/reserve': '备付金池概览',
  '/history': '操作历史',
};

export function Header() {
  const location = useLocation();
  const currentUser = useAppStore(state => state.currentUser);
  
  const getBreadcrumbs = () => {
    const crumbs = [{ label: '首页', path: '/', icon: Home }];
    if (location.pathname !== '/') {
      if (location.pathname.startsWith('/refund/')) {
        crumbs.push({ label: '退款单列表', path: '/', icon: undefined });
        crumbs.push({ label: '退款详情', path: location.pathname, icon: undefined });
      } else {
        const title = routeTitles[location.pathname] || '页面';
        crumbs.push({ label: title, path: location.pathname, icon: undefined });
      }
    }
    return crumbs;
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-white border-b-2 border-slate-200 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <ChevronRight size={14} className="text-slate-400" />}
              {crumb.path === location.pathname ? (
                <span className="font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                  {crumb.icon && <crumb.icon size={14} />}
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="font-mono text-slate-500 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                >
                  {crumb.icon && <crumb.icon size={14} />}
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-slate-600 border-2 border-slate-200 rounded hover:bg-slate-50 hover:border-amber-300 hover:text-amber-600 transition-all"
          >
            <RefreshCw size={14} />
            刷新
          </button>

          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-mono font-medium text-slate-800">
                {currentUser.originalName}
              </p>
              <p className="text-xs text-slate-500">
                {currentUser.role === 'operation' ? '支付运营' : currentUser.role === 'customer_service' ? '客服' : '结算'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
