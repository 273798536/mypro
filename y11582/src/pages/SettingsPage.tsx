
import { useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import { Settings, Play, Pause, RefreshCcw, AlertTriangle } from 'lucide-react';

export function SettingsPage() {
  const { resumeProcessing, loading } = useTaskStore();
  const [resumeCount, setResumeCount] = useState<number | null>(null);

  const handleResume = async () => {
    if (confirm('确定要恢复处理所有待处理任务吗？这将重新开始处理队列。')) {
      const count = await resumeProcessing();
      setResumeCount(count);
      setTimeout(() => setResumeCount(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-800">系统设置</h3>
        <p className="text-sm text-slate-500">管理队列服务和系统配置</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <Settings size={20} className="text-slate-500" />
          <h4 className="font-medium text-slate-800">队列服务控制</h4>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <button
              onClick={handleResume}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
              <div className="text-left">
                <p className="font-medium">恢复后续跑</p>
                <p className="text-xs text-blue-200">重新开始处理所有待处理任务</p>
              </div>
            </button>
            {resumeCount !== null && (
              <p className="text-sm text-green-600 text-center">
                已恢复处理 {resumeCount} 个任务
              </p>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-6 space-y-4">
            <h5 className="font-medium text-slate-800">服务状态</h5>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">自动处理</span>
                <span className="flex items-center gap-2 text-sm text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  运行中
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">重试间隔</span>
                <span className="text-sm text-slate-800">1min / 5min / 15min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">最大重试次数</span>
                <span className="text-sm text-slate-800">3 次</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-amber-600 shrink-0" size={24} />
          <div>
            <h5 className="font-medium text-amber-800 mb-1">注意事项</h5>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• 服务重启后会自动扫描并恢复处理 pending 和 waiting_retry 状态的任务</li>
              <li>• 死信任务需要人工确认后才能恢复处理</li>
              <li>• 所有操作都会记录操作历史，保留前后差异对比</li>
              <li>• 原始证据数据不会被修改，确保审计可追溯</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h4 className="font-medium text-slate-800">关于系统</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">系统名称</span>
            <p className="text-slate-800 font-medium">门店会员储值重试补偿队列服务</p>
          </div>
          <div>
            <span className="text-slate-500">版本</span>
            <p className="text-slate-800 font-medium">1.0.0</p>
          </div>
          <div>
            <span className="text-slate-500">支持来源</span>
            <p className="text-slate-800 font-medium">充值流水、退款申请、门店交接表、供应商对账单</p>
          </div>
          <div>
            <span className="text-slate-500">核心功能</span>
            <p className="text-slate-800 font-medium">自动重试、人工接管、补偿入账、差异审计</p>
          </div>
        </div>
      </div>
    </div>
  );
}
