import { Bell, Clock, Hash, Database } from 'lucide-react';
import { useReserveStore } from '../store/useReserveStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { lastCalculationTime, selectedRuleVersion, shipments, orders } = useReserveStore();
  
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary-900">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Database className="w-4 h-4" />
              <span>出货记录: <strong className="text-primary-800">{shipments.length}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Hash className="w-4 h-4" />
              <span>维修工单: <strong className="text-primary-800">{orders.length}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4" />
              <span>规则版本: <strong className="text-accent-emerald">{selectedRuleVersion}</strong></span>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-200" />
          
          {lastCalculationTime && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              上次计算: {new Date(lastCalculationTime).toLocaleString('zh-CN')}
            </div>
          )}
          
          <button className="relative p-2 text-slate-500 hover:text-primary-800 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-rose rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
