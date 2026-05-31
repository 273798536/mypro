import { Bell, Search, Settings } from 'lucide-react';
import { useAppStore } from '../../store';

export default function Header() {
  const deductibleErrors = useAppStore(
    (state) => state.recoveries.filter((r) => r.hasDeductibleError).length
  );

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索赔案号、合同号..."
              className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            {deductibleErrors > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                {deductibleErrors}
              </span>
            )}
          </button>
          <button className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
              张
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">张三</p>
              <p className="text-xs text-gray-500">再保会计</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
