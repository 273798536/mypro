import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useReserveStore } from '../store/useReserveStore';
import { useEffect, useState } from 'react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { 
    title: '概览仪表盘', 
    subtitle: '准备金余额趋势、索赔统计、批次分布一目了然' 
  },
  '/trial-calculation': { 
    title: '准备金试算', 
    subtitle: '按型号和批次滚动重算，实时预览计算结果' 
  },
  '/claim-deduplication': { 
    title: '索赔去重分析', 
    subtitle: '自动检测重复索赔，人工核对批次错配，全程留痕' 
  },
  '/rule-versions': { 
    title: '规则版本管理', 
    subtitle: '准备金规则历史追溯，版本对比，变更原因记录' 
  },
  '/rolling-report': { 
    title: '滚动报告', 
    subtitle: '完整计算链路展示，准备金试算与索赔去重过程追溯' 
  },
};

export default function Layout() {
  const initialize = useReserveStore(state => state.initialize);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  useEffect(() => {
    const updatePath = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);
  
  useEffect(() => {
    const originalPush = history.pushState;
    const originalReplace = history.replaceState;
    
    history.pushState = function(...args) {
      originalPush.apply(this, args);
      setCurrentPath(window.location.pathname);
    };
    
    history.replaceState = function(...args) {
      originalReplace.apply(this, args);
      setCurrentPath(window.location.pathname);
    };
    
    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);
  
  const pageInfo = pageTitles[currentPath] || { title: '', subtitle: '' };
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="flex-1 p-8 overflow-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
