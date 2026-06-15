import { useEffect } from 'react';
import { useReviewStore } from '@/store/reviewStore';
import WeatherPanel from '@/components/WeatherPanel';
import BuoyDataPanel from '@/components/BuoyDataPanel';
import OpinionPanel from '@/components/OpinionPanel';
import { Anchor, Plus, FileText, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { currentTask, createTask, rerunTask, confirmTask, rejectTask, supplementGap, supplementBuoyField } = useReviewStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentTask) {
      createTask();
    }
  }, []);

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Anchor className="w-16 h-16 mx-auto text-[#2E8BC0] mb-4" />
          <p className="text-gray-500 text-lg">正在加载复核数据…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0C2D48] text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Anchor className="w-7 h-7" />
            <h1 className="text-xl font-bold tracking-wide">海底管线路由复核</h1>
            <span className="text-xs bg-[#2E8BC0] px-2 py-0.5 rounded-full ml-2">
              第{currentTask.opinion?.runCount || 1}次运行
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/water-quality')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E8BC0] hover:bg-[#1a6fa0] rounded-lg text-sm transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              水质预警
            </button>
            <button
              onClick={() => navigate('/report')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2EC4B6] hover:bg-[#1fa89c] rounded-lg text-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              查看报告
            </button>
            <button
              onClick={() => createTask()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors border border-white/20"
            >
              <Plus className="w-4 h-4" />
              新建复核
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <WeatherPanel records={currentTask.weatherRecords} />
          </div>
          <div className="lg:col-span-1">
            <BuoyDataPanel
              records={currentTask.buoyRecords}
              onSupplement={(recordId, field, value) => supplementBuoyField(currentTask.id, recordId, field, value)}
            />
          </div>
          <div className="lg:col-span-1">
            <OpinionPanel
              opinion={currentTask.opinion}
              gapItems={currentTask.gapItems}
              supplementLog={currentTask.supplementLog}
              onConfirm={() => confirmTask(currentTask.id)}
              onReject={(reason) => rejectTask(currentTask.id, reason)}
              onRerun={() => rerunTask(currentTask.id)}
              onSupplementGap={(gapId, value) => supplementGap(currentTask.id, gapId, value)}
            />
          </div>
        </div>

        {currentTask.alerts.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-[#0C2D48] mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FF6B35]" />
              预警摘要
            </h3>
            <div className="flex flex-wrap gap-3">
              {currentTask.alerts.map(alert => (
                <span
                  key={alert.id}
                  className={`text-xs px-3 py-1.5 rounded-full ${
                    alert.afterJudgment === 'warning'
                      ? 'bg-orange-100 text-orange-700'
                      : alert.afterJudgment === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                  }`}
                >
                  {alert.indicator}: {alert.afterValue}{alert.thresholdUnit}
                  {alert.changedByExport && ' (导出变化)'}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
