import { useState } from 'react';
import { FlaskConical, TrendingUp, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import SampleTable from '@/components/SampleTable';
import SampleDrawer from '@/components/SampleDrawer';
import { useSampleStore } from '@/store/sampleStore';
import { SampleStatus, UserRole } from '@/types';

export default function QualityControl() {
  const { samples, userRole, resetToMock } = useSampleStore();
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  const stats = {
    total: samples.length,
    completed: samples.filter((s) => s.status === SampleStatus.COMPLETED).length,
    testing: samples.filter((s) => s.status === SampleStatus.TESTING).length,
    abnormal: samples.filter((s) => s.status === SampleStatus.ABNORMAL).length
  };

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute right-20 bottom-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FlaskConical size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">样本质控</h2>
              <p className="text-cyan-100 text-sm">日常追踪入口 · {userRole === UserRole.TEACHER ? '教师视图' : '学生视图'}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-white/15 backdrop-blur rounded-xl p-4">
              <p className="text-cyan-100 text-sm">样本总数</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-4">
              <p className="text-cyan-100 text-sm">已完成</p>
              <p className="text-3xl font-bold mt-1">{stats.completed}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-4">
              <p className="text-cyan-100 text-sm">检测中</p>
              <p className="text-3xl font-bold mt-1">{stats.testing}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-4">
              <p className="text-cyan-100 text-sm">异常</p>
              <p className="text-3xl font-bold mt-1">{stats.abnormal}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-sm font-medium">完成率 {completionRate}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle size={24} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">已完成样本</p>
            <p className="text-xl font-bold text-slate-800">{stats.completed} 份</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Clock size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">进行中</p>
            <p className="text-xl font-bold text-slate-800">{stats.testing} 份</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} className="text-rose-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">需关注</p>
            <p className="text-xl font-bold text-slate-800">{stats.abnormal} 份异常</p>
          </div>
        </div>
      </div>

      {userRole === UserRole.TEACHER && (
        <div className="flex justify-end">
          <button
            onClick={resetToMock}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            重置为示例数据
          </button>
        </div>
      )}

      <SampleTable onSelectSample={setSelectedSampleId} />

      {selectedSampleId && (
        <SampleDrawer
          sampleId={selectedSampleId}
          onClose={() => setSelectedSampleId(null)}
        />
      )}
    </div>
  );
}
