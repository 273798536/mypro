import { Volume2, Map, Camera, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const navItems = [
  { label: '主工作台', active: true },
  { label: '材料管理', active: false },
  { label: '容量复核', active: false },
  { label: '状态概览', active: false },
];

export function Header() {
  const { togglePhotoUploader } = useAppStore();

  return (
    <header className="relative z-50 w-full">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center -ml-3 border-2 border-slate-900 shadow-lg shadow-cyan-500/20">
                <Map className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="ml-2">
              <h1 className="text-lg font-bold text-white tracking-wide">
                公园噪声容量复核
              </h1>
              <p className="text-xs text-slate-400 -mt-0.5">
                Park Noise Capacity Review System
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                  ${item.active
                    ? 'text-white bg-slate-800/80 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }
                `}
              >
                {item.label}
                {item.active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => togglePhotoUploader(true)}
              className="
                group relative flex items-center gap-2 px-4 py-2 rounded-xl
                bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                text-white text-sm font-medium shadow-lg shadow-indigo-500/30
                hover:shadow-indigo-500/50 transition-all duration-300
                active:scale-95
              "
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">上传照片</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-700/50">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white">现场老师</span>
                <span className="text-xs text-slate-500">监测专员</span>
              </div>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
