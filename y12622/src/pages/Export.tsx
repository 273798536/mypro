import React from 'react';
import { ArrowLeft, FileDown, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ExportForm } from '../components/export/ExportForm';

export default function Export() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-serif">导出报告</h2>
          <p className="text-sm text-gray-500">
            导出文件使用通俗语言描述异常原因，方便不懂代码的人员查看
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900">数据一致性说明</h4>
            <p className="text-sm text-blue-700 mt-1">
              导出数据与看板图表、明细列表来自同一批处理记录，确保所有视图数据一致。
              缩放平移记录和异常标注共用同一批处理记录ID，追溯完整。
            </p>
          </div>
        </div>
      </div>

      <ExportForm />
    </div>
  );
}
