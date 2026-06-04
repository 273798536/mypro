import { useState } from 'react';
import {
  Download,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MapPin,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
} from 'lucide-react';
import type {
  InspectionRecord,
  AnnotationResult,
  GameStats,
} from '../types';
import { useRole } from '../context/RoleContext';
import {
  getStatusLabel,
  getStatusColor,
  getDataStatusLabel,
  getDataStatusColor,
} from '../data/samples';
import { exportReviewReport } from '../utils/export';
import { formatDuration } from '../utils/export';
import { formatCoord, getFlippedType } from '../utils/coordinate';
import { getOffsetDirection } from '../utils/hitDetection';

interface ReviewPanelProps {
  records: InspectionRecord[];
  results: AnnotationResult[];
  stats: GameStats;
  hitRate: number;
  elapsedTime: number;
  onRestart: () => void;
}

interface RecordResultProps {
  record: InspectionRecord;
  result: AnnotationResult | undefined;
  index: number;
}

function RecordResult({ record, result, index }: RecordResultProps) {
  const { isTeacher } = useRole();
  const [expanded, setExpanded] = useState(false);

  const dataStatus = !result
    ? 'needs_review'
    : record.status === 'error' || record.status === 'flipped'
    ? 'bad_data'
    : record.status === 'pending' || !result.isHit
    ? 'needs_review'
    : 'direct_use';

  const flippedType = record.isFlipped
    ? getFlippedType(record.displayedCoords, record.actualCoords)
    : null;

  const offsetDirection = result
    ? getOffsetDirection(result.userClick, record.actualCoords)
    : null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md">
      <div
        className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 flex items-center justify-center bg-slate-700 text-white rounded-full font-bold text-sm">
            {index + 1}
          </span>
          <div>
            <div className="font-medium text-slate-800">{record.name}</div>
            <div className="text-xs text-slate-500">{record.id}</div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(
              record.status
            )}`}
          >
            {getStatusLabel(record.status)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {result ? (
            <>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${getDataStatusColor(
                  dataStatus
                )}`}
              >
                {getDataStatusLabel(dataStatus)}
              </span>
              <div className="text-right">
                <div className="font-bold text-lg text-slate-800">
                  {result.score}
                  <span className="text-sm text-slate-400 ml-1">分</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {result.isHit ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={result.isHit ? 'text-emerald-600' : 'text-red-600'}>
                    {result.isHit ? '命中' : '未命中'}
                  </span>
                  <span className="text-slate-400 ml-1">
                    {result.distance.toFixed(0)}px
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">未标注</span>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">显示坐标</div>
              <div className="font-mono text-sm font-medium">
                ({formatCoord(record.displayedCoords.x)},{' '}
                {formatCoord(record.displayedCoords.y)})
              </div>
            </div>
            {isTeacher && (
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <div className="text-xs text-emerald-600 mb-1">真实坐标</div>
                <div className="font-mono text-sm font-medium text-emerald-700">
                  ({formatCoord(record.actualCoords.x)},{' '}
                  {formatCoord(record.actualCoords.y)})
                </div>
              </div>
            )}
            {result && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">标注位置</div>
                <div className="font-mono text-sm font-medium text-blue-700">
                  ({formatCoord(result.userClick.x)},{' '}
                  {formatCoord(result.userClick.y)})
                </div>
              </div>
            )}
            {result && offsetDirection && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <div className="text-xs text-amber-600 mb-1">偏差方向</div>
                <div className="text-sm font-medium text-amber-700">
                  {offsetDirection.direction}
                  {offsetDirection.dx !== 0 && offsetDirection.dy !== 0 && (
                    <span className="text-xs ml-1">
                      (ΔX:{offsetDirection.dx.toFixed(0)}, ΔY:
                      {offsetDirection.dy.toFixed(0)})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {record.isFlipped && flippedType && (
            <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
              <div className="flex items-center gap-2 text-rose-700 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">坐标翻转类型</span>
              </div>
              <p className="text-sm text-rose-600">
                {flippedType === 'xy_swap' && 'X/Y 坐标互换'}
                {flippedType === 'negate' && '坐标符号取反'}
                {flippedType === 'both' && '坐标互换并取反'}
              </p>
            </div>
          )}

          {isTeacher && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium">数据溯源信息</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">原始行号</span>
                  <span className="font-mono">
                    第 {record.sourceMeta.originalRow} 行
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">数据表</span>
                  <span className="font-mono">{record.sourceMeta.dataSource}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-slate-500">图片名</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border">
                    {record.sourceMeta.imageName}
                  </span>
                </div>
                <div className="col-span-2 mt-1 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">来源备注</span>
                  <p className="text-slate-700 mt-1">{record.sourceMeta.remark}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">轨迹点数</span>
            </div>
            <p className="text-sm text-amber-700">
              共 {record.trajectory.length} 个轨迹点
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewPanel({
  records,
  results,
  stats,
  hitRate,
  elapsedTime,
  onRestart,
}: ReviewPanelProps) {
  const { isTeacher } = useRole();

  const handleExport = () => {
    exportReviewReport(records, results, elapsedTime, stats.totalScore, hitRate);
  };

  const getGrade = (score: number): { grade: string; color: string; emoji: string } => {
    if (score >= 250) return { grade: '优秀', color: 'text-emerald-600', emoji: '🏆' };
    if (score >= 200) return { grade: '良好', color: 'text-blue-600', emoji: '👍' };
    if (score >= 150) return { grade: '及格', color: 'text-amber-600', emoji: '📚' };
    return { grade: '需加强', color: 'text-red-600', emoji: '💪' };
  };

  const gradeInfo = getGrade(stats.totalScore);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slideUp">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-400" />
              <div>
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: 'Noto Serif SC, serif' }}
                >
                  标注练习复盘报告
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  用时 {formatDuration(elapsedTime)} · 共 {records.length} 条记录
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-amber-400">
                {stats.totalScore}
              </div>
              <div className="text-slate-400 text-sm">总得分</div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200 text-center">
              <div className="text-3xl font-bold text-emerald-600">
                {hitRate}%
              </div>
              <div className="text-sm text-emerald-700 mt-1">命中率</div>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-xl border border-cyan-200 text-center">
              <div className="text-3xl font-bold text-cyan-600">
                {stats.hits}
              </div>
              <div className="text-sm text-cyan-700 mt-1">命中数</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200 text-center">
              <div className="text-3xl font-bold text-red-600">
                {stats.misses}
              </div>
              <div className="text-sm text-red-700 mt-1">未命中</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 text-center">
              <div className={`text-3xl font-bold ${gradeInfo.color}`}>
                {gradeInfo.emoji} {gradeInfo.grade}
              </div>
              <div className="text-sm text-amber-700 mt-1">综合评级</div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              标注详情
            </h3>
            <div className="space-y-3">
              {records.map((record, index) => (
                <RecordResult
                  key={record.id}
                  record={record}
                  result={results.find((r) => r.recordId === record.id)}
                  index={index}
                />
              ))}
            </div>
          </div>

          {isTeacher && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4">
              <h4 className="font-medium text-blue-800 mb-2">教研老师提示</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 绿色标记「可直接使用」表示数据质量良好，学生标注准确</li>
                <li>• 黄色标记「需教研复核」表示待确认数据或学生标注有偏差</li>
                <li>• 红色标记「异常数据」表示存在坐标翻转等问题的记录</li>
                <li>• 点击「导出复盘报告」可下载完整JSON格式报告用于教学存档</li>
              </ul>
            </div>
          )}

          {!isTeacher && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <h4 className="font-medium text-slate-800 mb-2">学生提示</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• 详细的溯源信息仅教研老师可见</li>
                <li>• 如有疑问，请联系教研老师复核原始数据</li>
                <li>• 坐标翻转类问题是学习重点，注意总结识别方法</li>
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            平均偏差: {stats.averageDistance.toFixed(1)}px
          </div>
          <div className="flex items-center gap-3">
            {isTeacher && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Download className="w-5 h-5" />
                导出复盘报告
              </button>
            )}
            <button
              onClick={onRestart}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <RotateCcw className="w-5 h-5" />
              再来一局
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
