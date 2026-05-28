import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { ExportConfig } from '../components/ExportConfig';
import { ExportTaskCard } from '../components/ExportTaskCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import Empty from '../components/Empty';
import { exportService } from '../services';

export default function ExportCenter() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['exportTasks'],
    queryFn: () => exportService.getTasks(),
    refetchInterval: 5000,
  });

  const tasks = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-blue-900 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Download className="h-7 w-7" />
          <div>
            <h1 className="text-xl font-bold">报告导出中心</h1>
            <p className="text-blue-200 text-sm">批量导出残值试算报告，支持Excel和PDF格式</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <ExportConfig />

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">导出任务列表</h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-slate-600">正在加载导出任务...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">加载失败</p>
              <p className="text-slate-500 text-sm mt-1">请稍后重试</p>
            </div>
          ) : tasks.length === 0 ? (
            <Empty />
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className="opacity-0 animate-[fadeInUp_0.4s_ease-out_forwards]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ExportTaskCard task={task} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}
