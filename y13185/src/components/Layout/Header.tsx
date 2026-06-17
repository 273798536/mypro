import { useState, useEffect, useMemo } from 'react';
import { Bell, User, Settings, Menu, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useExperimentStore } from '@/store/useExperimentStore';
import { getCurrentUser } from '@/utils/storage';

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export const Header = ({ onToggleSidebar, sidebarCollapsed }: HeaderProps) => {
  const [currentUser, setCurrentUser] = useState('维修师傅');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const suspendRecords = useExperimentStore(state => state.suspendRecords);
  const pendingSuspends = useMemo(
    () => suspendRecords.filter(s => s.status === 'pending'),
    [suspendRecords]
  );
  const error = useExperimentStore(state => state.error);
  const clearError = useExperimentStore(state => state.clearError);
  
  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);
  
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
        
        <div>
          <h2 className="text-lg font-semibold text-gray-900">风洞烟线实验复算</h2>
          <p className="text-xs text-gray-500">专业实验数据分析平台</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="text-red-600 hover:text-red-700 p-0 h-auto"
            >
              关闭
            </Button>
          </div>
        )}
        
        <div className="relative">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5 text-gray-600" />
            {pendingSuspends.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E94560] text-white text-xs rounded-full flex items-center justify-center">
                {pendingSuspends.length}
              </span>
            )}
          </Button>
        </div>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-8 h-8 rounded-full bg-[#0F3460] text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{currentUser}</p>
              <p className="text-xs text-gray-500">
                {currentUser.includes('阿岑') ? '维修师傅' : currentUser.includes('经理') ? '项目经理' : '实验工程师'}
              </p>
            </div>
          </Button>
          
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{currentUser}</p>
                <StatusBadge status="info" size="sm" className="mt-1">
                  {currentUser.includes('阿岑') ? '维修师傅' : '实验工程师'}
                </StatusBadge>
              </div>
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                个人设置
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                onClick={() => setShowUserMenu(false)}
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
