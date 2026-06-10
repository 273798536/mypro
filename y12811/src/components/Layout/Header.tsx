import { Bell, Search, Settings, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 bg-lab-950/60 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white">微生物丰度热图分析平台</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lab-400" />
          <input
            type="text"
            placeholder="搜索样本、微生物..."
            className="w-64 h-9 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-lab-400 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 transition-all duration-200"
          />
        </div>
        
        <button className="relative p-2 rounded-lg text-lab-300 hover:text-white hover:bg-white/5 transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-400 rounded-full"></span>
        </button>
        
        <button className="p-2 rounded-lg text-lab-300 hover:text-white hover:bg-white/5 transition-all duration-200">
          <Settings className="w-5 h-5" />
        </button>
        
        <div className="h-8 w-px bg-white/10"></div>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-400/20 flex items-center justify-center">
            <User className="w-4 h-4 text-teal-400" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">张技师</p>
            <p className="text-xs text-lab-400">实验室技术员</p>
          </div>
        </div>
      </div>
    </header>
  );
}
