import { MapPin, AlertTriangle, FileText, Lightbulb, FlipHorizontal2 } from 'lucide-react';
import type { InspectionRecord } from '../types';
import { useRole } from '../context/RoleContext';
import { getStatusLabel, getStatusColor } from '../data/samples';
import { formatCoord } from '../utils/coordinate';

interface InfoPanelProps {
  record: InspectionRecord | null;
  phase: string;
}

export function InfoPanel({ record, phase }: InfoPanelProps) {
  const { isTeacher } = useRole();

  if (!record) {
    return (
      <div className="w-72 bg-white rounded-xl shadow-lg p-5 border border-slate-200">
        <div className="text-slate-400 text-center py-8">
          暂无记录数据
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">当前记录</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(
              record.status
            )}`}
          >
            {getStatusLabel(record.status)}
          </span>
        </div>
        <h3
          className="text-lg font-bold"
          style={{ fontFamily: 'Noto Serif SC, serif' }}
        >
          {record.name}
        </h3>
        <p className="text-sm text-slate-400 mt-1">ID: {record.id}</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">显示坐标</span>
          </div>
          <div className="font-mono text-lg font-bold text-slate-800">
            ({formatCoord(record.displayedCoords.x)},{' '}
            {formatCoord(record.displayedCoords.y)})
          </div>
        </div>

        {isTeacher && (
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">真实坐标（教研可见）</span>
            </div>
            <div className="font-mono text-lg font-bold text-emerald-800">
              ({formatCoord(record.actualCoords.x)},{' '}
              {formatCoord(record.actualCoords.y)})
            </div>
          </div>
        )}

        {record.isFlipped && (
          <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
            <div className="flex items-center gap-2 text-rose-700 mb-2">
              <FlipHorizontal2 className="w-4 h-4" />
              <span className="text-sm font-medium">坐标翻转标记</span>
            </div>
            <p className="text-sm text-rose-600">
              该记录疑似存在 X/Y 坐标翻转，请注意识别
            </p>
          </div>
        )}

        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">操作提示</span>
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">
            {record.hint}
          </p>
        </div>

        {isTeacher && (
          <div className="bg-slate-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-700 mb-3">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">数据溯源（教研可见）</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">原始行号</span>
                <span className="font-mono font-medium text-slate-800">
                  第 {record.sourceMeta.originalRow} 行
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">图片名</span>
                <span className="font-mono text-xs text-slate-800 bg-white px-2 py-0.5 rounded border">
                  {record.sourceMeta.imageName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">数据表</span>
                <span className="font-mono text-xs text-slate-800">
                  {record.sourceMeta.dataSource}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 text-xs">来源备注</span>
                <p className="text-slate-700 mt-1 text-xs leading-relaxed">
                  {record.sourceMeta.remark}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isTeacher && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">
                完整溯源信息仅教研老师可见
              </span>
            </div>
          </div>
        )}

        {phase === 'idle' && (
          <div className="text-center py-3 text-slate-500 text-sm">
            点击「开始」按钮进行标注练习
          </div>
        )}
      </div>
    </div>
  );
}
