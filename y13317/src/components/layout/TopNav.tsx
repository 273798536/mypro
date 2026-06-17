import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  AlertTriangle,
  ChevronDown,
  User,
  LogOut,
  Settings,
  HelpCircle,
} from 'lucide-react';

const routeMap: Record<string, string> = {
  '/dashboard': '总览仪表盘',
  '/trace': '异常追溯',
  '/influence': '影响因素分析',
  '/citation': '引用完整性校验',
  '/version-diff': '版本对比中心',
  '/export': '导出与一致性',
  '/operator': '周姐工作台',
};

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [version, setVersion] = useState('v2');
  const [versionOpen, setVersionOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const versionRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const currentRouteName = routeMap[location.pathname] || '';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (versionRef.current && !versionRef.current.contains(e.target as Node)) {
        setVersionOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const citationMissingCount = 17;

  return (
    <header className="fixed top-0 left-0 right-0 h-[64px] ml-[248px] bg-white border-b border-gray-100 z-30">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/dashboard" className="text-gray-500 hover:text-industrial transition-colors">
            首页
          </Link>
          {currentRouteName && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-gray-900 font-medium">{currentRouteName}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={versionRef}>
            <button
              onClick={() => {
                setVersionOpen(!versionOpen);
                setUserOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="text-industrial font-semibold">{version}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {versionOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-card border border-gray-100 py-1 z-50 animate-fade-in-down">
                {['v1', 'v2'].map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setVersion(v);
                      setVersionOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      version === v
                        ? 'bg-industrial-50 text-industrial font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/citation')}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-danger-50 transition-colors group"
          >
            <div className="relative">
              <AlertTriangle className="w-5 h-5 text-warning animate-pulse" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-breathe">
                {citationMissingCount > 99 ? '99+' : citationMissingCount}
              </span>
            </div>
            <span className="text-sm font-medium text-danger hidden sm:inline">引用缺失</span>
          </button>

          <div className="relative" ref={userRef}>
            <button
              onClick={() => {
                setUserOpen(!userOpen);
                setVersionOpen(false);
              }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-industrial rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-card border border-gray-100 py-1 z-50 animate-fade-in-down">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">周姐</p>
                  <p className="text-xs text-gray-500 mt-0.5">标注负责人</p>
                </div>
                <button className="w-full px-4 py-2 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4 text-gray-400" />
                  个人设置
                </button>
                <button className="w-full px-4 py-2 flex items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                  帮助中心
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button className="w-full px-4 py-2 flex items-center gap-3 text-sm text-danger hover:bg-danger-50 transition-colors">
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
