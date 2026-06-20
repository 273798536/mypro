import React from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Search, ShieldCheck, Bell } from 'lucide-react';
import { useFailureStore } from '@/stores/failureStore';
import { useFeatureStore } from '@/stores/featureStore';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: '总览看板', subtitle: '失败队列、特征迟到、版本状态一览' },
  '/failure-queue': { title: '失败队列追踪', subtitle: '多任务失败日志拼接为主线，人工修正与公示备注' },
  '/timeline': { title: '历史时间线', subtitle: '样本/版本/阈值/修正/指标串联一致性校验' },
  '/compare': { title: '版本对比', subtitle: '样本分布、阈值配置、人工修正、指标变化对比' },
  '/late-features': { title: '特征迟到专区', subtitle: '迟到特征单独拎出，揉入正常结果风险标记' },
};

export const TopBar: React.FC = () => {
  const loc = useLocation();
  const path = Object.keys(titles).find(k =>
    k === '/' ? loc.pathname === '/' : loc.pathname.startsWith(k)
  ) || '/';
  const info = titles[path];

  const failureCount = useFailureStore(s => s.logs.filter(l => l.level !== 'warning').length);
  const mixedCount = useFeatureStore(s => s.getMixedCount());

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border-default bg-root/80 backdrop-blur-md">
      <div className="h-full px-8 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold text-primary">{info.title}</h1>
            <span className="chip">
              <ShieldCheck className="w-3 h-3 text-emerald" strokeWidth={2} />
              <span className="text-emerald">已关联 17 条主线</span>
            </span>
          </div>
          <div className="text-[12px] text-muted mt-0.5">{info.subtitle}</div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={1.8} />
            <input
              placeholder="搜索日志、样本ID、特征..."
              className="w-72 h-9 pl-9 pr-4 rounded-lg bg-elevated border border-border-emphasis text-[12px] text-primary placeholder:text-muted focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/40 transition-all"
            />
          </div>

          <button className="btn-operate !px-3 !py-2 relative">
            <Bell className="w-4 h-4" strokeWidth={1.8} />
            {(failureCount > 0 || mixedCount > 0) && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-[10px] font-mono font-bold text-white flex items-center justify-center animate-count-pop glow-ring-red">
                {failureCount + mixedCount}
              </span>
            )}
          </button>

          <button className="btn-operate">
            <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
            刷新同步
          </button>
        </div>
      </div>
    </header>
  );
};
