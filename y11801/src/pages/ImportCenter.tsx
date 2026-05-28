import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { DropZone } from '../components/DropZone';
import { ImportTimelineItem } from '../components/ImportTimelineItem';
import { LoadingSpinner } from '../components/LoadingSpinner';
import Empty from '../components/Empty';
import { importService } from '../services';
import type { ImportDataType } from 'shared/types';

export default function ImportCenter() {
  const [dataType, setDataType] = useState<ImportDataType>('vehicle');

  const { data, isLoading, error } = useQuery({
    queryKey: ['importLogs'],
    queryFn: () => importService.getLogs(1, 50),
    refetchInterval: 10000,
  });

  const logs = Array.isArray(data?.data) ? data.data : [];

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-blue-900 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Database className="h-7 w-7" />
          <div>
            <h1 className="text-xl font-bold">数据导入中心</h1>
            <p className="text-blue-200 text-sm">批量导入车辆档案、贷款合同和残值表数据</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">上传数据文件</h2>
          <DropZone dataType={dataType} onDataTypeChange={setDataType} />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">导入任务记录</h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p className="text-slate-600">正在加载导入记录...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-medium">加载失败</p>
              <p className="text-slate-500 text-sm mt-1">请稍后重试</p>
            </div>
          ) : logs.length === 0 ? (
            <Empty />
          ) : (
            <div className="relative">
              {logs.map((log, index) => (
                <ImportTimelineItem
                  key={log.id}
                  log={log}
                  isNew={index === 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
