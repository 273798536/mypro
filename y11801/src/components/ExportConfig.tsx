import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, FileText, Building2, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportService } from '../services';
import type { ResultStatus } from 'shared/types';
import { RESULT_STATUS_CONFIG } from 'shared/constants';

export function ExportConfig() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ResultStatus | ''>('');
  const [storeId, setStoreId] = useState('');
  const [exportType, setExportType] = useState<'excel' | 'pdf'>('excel');
  const [taskName, setTaskName] = useState('');

  const generateMutation = useMutation({
    mutationFn: () =>
      exportService.generate({
        taskName: taskName || `导出报告_${new Date().toLocaleDateString('zh-CN')}`,
        exportType,
        status: status || undefined,
        storeId: storeId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTasks'] });
      setStatus('');
      setStoreId('');
      setTaskName('');
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Download className="h-5 w-5 text-blue-900" />
        导出配置
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <Filter className="h-4 w-4" />
            按状态筛选
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ResultStatus | '')}
            className="w-full px-3 py-2 border-2 border-slate-300 rounded focus:outline-none focus:border-blue-900 text-sm"
          >
            <option value="">全部状态</option>
            {Object.entries(RESULT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            按门店筛选
          </label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-300 rounded focus:outline-none focus:border-blue-900 text-sm"
          >
            <option value="">全部门店</option>
            <option value="S001">北京朝阳店</option>
            <option value="S002">上海浦东店</option>
            <option value="S003">广州天河店</option>
            <option value="S004">深圳南山店</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            导出格式
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setExportType('excel')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium rounded border-2 transition-colors',
                exportType === 'excel'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-slate-300 text-slate-600 hover:border-green-400'
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={() => setExportType('pdf')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium rounded border-2 transition-colors',
                exportType === 'pdf'
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-slate-300 text-slate-600 hover:border-red-400'
              )}
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            报告名称
          </label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="请输入报告名称"
            className="w-full px-3 py-2 border-2 border-slate-300 rounded focus:outline-none focus:border-blue-900 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-900 border-2 border-blue-900 rounded hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          {generateMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              生成报告
            </>
          )}
        </button>
      </div>

      {generateMutation.isSuccess && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          <p className="font-medium">导出任务已创建！</p>
          <p className="text-sm mt-1">报告正在生成中，请在下方列表查看进度。</p>
        </div>
      )}

      {generateMutation.isError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">生成失败</p>
          <p className="text-sm mt-1">{(generateMutation.error as Error).message}</p>
        </div>
      )}
    </div>
  );
}
