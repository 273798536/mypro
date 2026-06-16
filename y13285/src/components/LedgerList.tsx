import { useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Play,
  Database,
  Trash2,
  MapPin,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { StatusBadge } from './StatusBadge';
import type { ApprovalLedger } from '@/types';

export function LedgerList() {
  const { ledgers, loadMockData, importLedgers, reRunMerge, clearAll } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ApprovalLedger[];
        importLedgers(data);
        alert('导入成功！');
      } catch {
        alert('文件格式错误，请导入正确的 JSON 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={loadMockData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors text-sm font-medium shadow-sm"
        >
          <Database size={16} />
          放样例
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
        >
          <Upload size={16} />
          导入
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={reRunMerge}
          disabled={ledgers.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-500 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={16} />
          重跑
        </button>
        <button
          onClick={clearAll}
          disabled={ledgers.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
          清空
        </button>
      </div>

      {ledgers.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-sm font-medium text-gray-900">暂无审批台账</h3>
          <p className="mt-1 text-sm text-gray-500">点击「放样例」按钮载入测试数据，或「导入」JSON 文件</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属街口</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">卸货点位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">审批日期</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">方案版本</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注/投诉</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ledgers.map((ledger, index) => (
                <tr key={ledger.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-primary-50 transition-colors`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <FileText size={14} className="text-primary-600" />
                      {ledger.projectName}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <MapPin size={12} className="text-gray-400" />
                      {ledger.street}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {ledger.pointLocation}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <User size={12} className="text-gray-400" />
                      {ledger.applicant}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-700 flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      {ledger.approvalDate}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
                      {ledger.schemeVersion}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={ledger.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
                    {ledger.complaintContent ? (
                      <div className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-100">
                        <strong>投诉：</strong>{ledger.complaintContent}
                      </div>
                    ) : (
                      <span className="text-gray-500">{ledger.remarks || '-'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
