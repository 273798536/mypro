import { useEffect } from 'react';
import { ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import type { WaterQualityAlert } from '@/types';
import { useReviewStore } from '@/store/reviewStore';
import { useNavigate } from 'react-router-dom';

const JUDGMENT_LABEL: Record<WaterQualityAlert['afterJudgment'], string> = {
  normal: '正常',
  warning: '预警',
  critical: '严重',
};

const JUDGMENT_COLOR: Record<WaterQualityAlert['afterJudgment'], string> = {
  normal: 'text-emerald-600 bg-emerald-50',
  warning: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
};

const JUDGMENT_BORDER: Record<WaterQualityAlert['afterJudgment'], string> = {
  normal: 'border-l-emerald-500',
  warning: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

export default function WaterQualityPage() {
  const currentTask = useReviewStore((s) => s.currentTask);
  const createTask = useReviewStore((s) => s.createTask);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentTask) {
      createTask();
    }
  }, [currentTask, createTask]);

  if (!currentTask) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <ShieldCheck className="w-16 h-16 mb-4" />
        <p className="text-lg">暂无任务数据</p>
      </div>
    );
  }

  const { alerts } = currentTask;
  const changedAlerts = alerts.filter((a) => a.changedByExport);

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="px-6 py-4 text-white flex items-center gap-3"
        style={{ backgroundColor: '#0C2D48' }}
      >
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          title="返回总览"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold">水质预警</h1>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-medium text-gray-700">预警指标</h2>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg border border-l-4 ${JUDGMENT_BORDER[alert.afterJudgment]} p-4 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">
                  {alert.indicator}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${JUDGMENT_COLOR[alert.afterJudgment]}`}
                >
                  {JUDGMENT_LABEL[alert.afterJudgment]}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                阈值: {alert.threshold} {alert.thresholdUnit}
              </p>
              <p className="text-sm text-gray-600 mt-1">{alert.reason}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-gray-700">导出前后对比</h2>
          {changedAlerts.length === 0 ? (
            <div className="bg-white rounded-lg border p-6 text-center text-gray-400">
              报告导出未改变任何判断
            </div>
          ) : (
            changedAlerts.map((alert) => {
              const valueChanged = alert.beforeValue !== alert.afterValue;
              return (
                <div
                  key={alert.id}
                  className="bg-gray-50 border rounded-lg p-4 space-y-3"
                >
                  <p className="text-sm font-medium text-gray-700">
                    {alert.indicator}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-400 mb-1">导出前</p>
                      <p
                        className={`text-lg font-semibold ${
                          valueChanged ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {alert.beforeValue} {alert.thresholdUnit}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${JUDGMENT_COLOR[alert.beforeJudgment]}`}
                      >
                        {JUDGMENT_LABEL[alert.beforeJudgment]}
                      </span>
                    </div>

                    <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />

                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-400 mb-1">导出后</p>
                      <p
                        className={`text-lg font-semibold text-emerald-700 ${
                          valueChanged ? 'animate-pulse bg-emerald-50 rounded px-2' : ''
                        }`}
                      >
                        {alert.afterValue} {alert.thresholdUnit}
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${JUDGMENT_COLOR[alert.afterJudgment]}`}
                      >
                        {JUDGMENT_LABEL[alert.afterJudgment]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
