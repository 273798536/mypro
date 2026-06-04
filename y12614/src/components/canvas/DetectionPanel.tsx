import { AlertTriangle, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';
import { useSelectionStore } from '@/store/useSelectionStore';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function DetectionPanel() {
  const { selections, detectionResults } = useSelectionStore();

  const stats = {
    total: selections.length,
    passed: selections.filter(s => s.detectionResult === 'pass').length,
    warnings: selections.filter(s => s.detectionResult === 'warning').length,
    failed: selections.filter(s => s.detectionResult === 'fail').length,
    outOfBounds: selections.filter(s => s.isOutOfBounds).length,
    colliding: selections.filter(s => s.isColliding).length
  };

  return (
    <div className="w-80 bg-white border-l flex flex-col h-full">
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
        <h3 className="font-semibold text-gray-800">实时检测</h3>
        <p className="text-xs text-gray-500 mt-1">颜色越界与边界碰撞检测</p>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3 border-b">
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-700">{stats.passed}</span>
          </div>
          <p className="text-xs text-green-600 mt-1">通过</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold text-red-700">{stats.failed}</span>
          </div>
          <p className="text-xs text-red-600 mt-1">不通过</p>
        </div>
      </div>

      <div className="p-4 border-b">
        <h4 className="text-sm font-medium text-gray-700 mb-3">检测详情</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">总圈选数</span>
            <span className="text-sm font-medium">{stats.total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">颜色越界</span>
            <span className={cn(
              'text-sm font-medium',
              stats.outOfBounds > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {stats.outOfBounds} 处
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">边界碰撞</span>
            <span className={cn(
              'text-sm font-medium',
              stats.colliding > 0 ? 'text-orange-600' : 'text-green-600'
            )}>
              {stats.colliding} 处
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">检测说明</h4>
        
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">颜色越界</p>
                <p className="text-xs text-red-600 mt-1 leading-relaxed">
                  圈选区域包含过多与病斑特征不符的像素。病斑应保持一致的颜色特征，
                  若混入正常叶片组织或背景，将触发警告。
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">边界碰撞</p>
                <p className="text-xs text-orange-600 mt-1 leading-relaxed">
                  圈选范围过于靠近或超出叶片边缘。叶缘颜色纹理与病斑可能相似，
                  需保持至少5像素安全距离以避免误判。
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">为什么这样设计？</p>
                <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                  持续检测机制确保每一次圈选都经过严格校验，而非一次性判断。
                  即使缩放平移后，坐标也会实时更新，保证检测精度始终如一。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t bg-gray-50">
        {selections.length > 0 ? (
          <Link
            to="/report"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#2D5A27] text-white rounded-lg hover:bg-[#3d7336] transition-colors"
          >
            生成检测报告
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <p className="text-center text-sm text-gray-400">
            完成圈选后可生成报告
          </p>
        )}
      </div>
    </div>
  );
}
