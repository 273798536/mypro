import { CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';
import type { Selection } from '@/types';
import { cn } from '@/lib/utils';

interface ResultSummaryProps {
  selections: Selection[];
  sampleName: string;
}

export function ResultSummary({ selections, sampleName }: ResultSummaryProps) {
  const stats = {
    total: selections.length,
    passed: selections.filter(s => s.detectionResult === 'pass').length,
    warnings: selections.filter(s => s.detectionResult === 'warning').length,
    failed: selections.filter(s => s.detectionResult === 'fail').length,
    outOfBounds: selections.filter(s => s.isOutOfBounds).length,
    colliding: selections.filter(s => s.isColliding).length
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case 'pass': return '通过';
      case 'warning': return '待确认';
      case 'fail': return '不通过';
      default: return result;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#2D5A27]/10 rounded-lg">
            <FileText className="w-6 h-6 text-[#2D5A27]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">检测结果汇总</h2>
            <p className="text-sm text-gray-500">{sampleName}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-sm text-gray-500">总圈选</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats.passed}</p>
            <p className="text-sm text-green-600">通过</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats.warnings}</p>
            <p className="text-sm text-yellow-600">待确认</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-sm text-red-600">不通过</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-semibold text-gray-800 mb-4">圈选明细</h3>
        
        {selections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>暂无圈选记录</p>
            <p className="text-sm mt-1">请先在主页完成病斑圈选</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selections.map((selection, index) => (
              <div
                key={selection.id}
                className={cn(
                  'p-4 rounded-lg border flex items-center justify-between',
                  selection.detectionResult === 'pass' && 'border-green-200 bg-green-50/30',
                  selection.detectionResult === 'warning' && 'border-yellow-200 bg-yellow-50/30',
                  selection.detectionResult === 'fail' && 'border-red-200 bg-red-50/30'
                )}
              >
                <div className="flex items-center gap-4">
                  {getResultIcon(selection.detectionResult)}
                  <div>
                    <p className="font-medium text-gray-800">圈选 #{index + 1}</p>
                    <p className="text-sm text-gray-500">
                      {selection.points.length} 个顶点
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-wrap gap-2">
                    {selection.isOutOfBounds && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                        颜色越界
                      </span>
                    )}
                    {selection.isColliding && (
                      <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                        边界碰撞
                      </span>
                    )}
                    {!selection.isOutOfBounds && !selection.isColliding && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                        正常
                      </span>
                    )}
                  </div>
                  
                  <span className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    selection.detectionResult === 'pass' && 'bg-green-100 text-green-700',
                    selection.detectionResult === 'warning' && 'bg-yellow-100 text-yellow-700',
                    selection.detectionResult === 'fail' && 'bg-red-100 text-red-700'
                  )}>
                    {getResultLabel(selection.detectionResult)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-3">检测说明</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>• <strong>颜色越界</strong>: 圈选区域包含异常颜色像素超过阈值，可能混入了正常叶片组织或背景</p>
          <p>• <strong>边界碰撞</strong>: 圈选范围过于靠近叶片边缘，叶缘颜色纹理可能与病斑相似造成误判</p>
          <p>• 所有检测均为实时进行，缩放平移后坐标会自动更新确保检测准确</p>
        </div>
      </div>
    </div>
  );
}
