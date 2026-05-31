import { Bell, Search, User, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';

export function Header() {
  const currentBalance = useStore((state) => state.currentBalance);
  const pendingExceptions = useStore((state) =>
    state.exceptions.filter((ex) => ex.status === 'pending').length
  );

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索账单、资源、异常..."
            className="w-80 h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 rounded-lg">
          <span className="text-sm text-gray-600">账户余额</span>
          <span className="font-semibold text-primary-700">
            {formatCurrency(currentBalance)}
          </span>
        </div>

        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          {pendingExceptions > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning-500 text-white text-xs font-medium rounded-full flex items-center justify-center animate-pulse">
              {pendingExceptions}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-700">财务管理员</p>
            <p className="text-xs text-gray-500">IT财务部</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </header>
  );
}
