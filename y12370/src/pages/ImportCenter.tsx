import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  BookOpen,
  Zap,
  Trash2,
  ArrowRight,
  Database,
  History,
} from 'lucide-react';
import { ImportCard } from '../components/import/ImportCard';
import { useDataStore } from '../store/useDataStore';
import { useBookingStore } from '../store/useBookingStore';
import { useConflictStore } from '../store/useConflictStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { formatDateTime } from '../utils/dateUtils';

export function ImportCenter() {
  const navigate = useNavigate();
  
  const {
    sources,
    rooms,
    bands,
    courses,
    loadFromStorage,
    loadSampleData,
    clearAll,
    getVersionHistory,
    isLoading,
  } = useDataStore();
  
  const { bookings, generateBookings } = useBookingStore();
  const { conflicts, getUnresolvedCount } = useConflictStore();
  const { loadFromStorage: loadHistory } = useHistoryStore();

  useEffect(() => {
    loadFromStorage();
    loadHistory();
  }, [loadFromStorage, loadHistory]);

  const canGenerate = rooms.length > 0 && bands.length > 0 && courses.length > 0;
  const unresolvedCount = getUnresolvedCount();

  const getLatestVersion = (type: 'room' | 'band' | 'course') => {
    const history = getVersionHistory(type);
    if (history.length === 0) return undefined;
    const latest = history[0];
    return `${latest.version} · ${formatDateTime(latest.importedAt)}`;
  };

  const handleLoadSample = async () => {
    await loadSampleData();
  };

  const handleGenerate = () => {
    generateBookings();
  };

  const handleClear = async () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      await clearAll();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-900">
            数据导入中心
          </h1>
          <p className="text-primary-600 mt-1">
            导入排练室表、乐队名单和课程安排，系统将自动生成预约并检测冲突
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleLoadSample}
            className="btn-secondary flex items-center gap-2"
            disabled={isLoading}
          >
            <Zap className="w-4 h-4" />
            载入样例数据
          </button>
          {bookings.length > 0 && (
            <button
              onClick={handleClear}
              className="btn-danger flex items-center gap-2"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
              清除所有数据
            </button>
          )}
        </div>
      </div>

      {bookings.length > 0 && (
        <div className="card p-4 bg-gradient-to-r from-primary-50 to-primary-100/50 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-primary-700">
                  已有 <span className="font-bold text-primary-900">{bookings.length}</span> 条预约
                </span>
              </div>
              {conflicts.length > 0 && (
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-conflict" />
                  <span className="text-sm text-conflict-dark">
                    <span className="font-bold">{unresolvedCount}</span> 个待处理冲突
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/board')}
              className="btn-primary flex items-center gap-2"
            >
              查看预约看板
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ImportCard
          type="room"
          title="排练室表"
          description="导入排练室信息及设备配置"
          icon={<Building2 className="w-6 h-6" />}
          count={rooms.length}
          latestVersion={getLatestVersion('room')}
        />
        <ImportCard
          type="band"
          title="乐队名单"
          description="导入乐队成员及设备需求"
          icon={<Users className="w-6 h-6" />}
          count={bands.length}
          latestVersion={getLatestVersion('band')}
        />
        <ImportCard
          type="course"
          title="课程安排"
          description="导入课程时间及教师信息"
          icon={<BookOpen className="w-6 h-6" />}
          count={courses.length}
          latestVersion={getLatestVersion('course')}
        />
      </div>

      {sources.length > 0 && (
        <div className="card p-6">
          <h2 className="font-serif text-lg font-semibold text-primary-900 mb-4">
            数据来源记录
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="text-left py-3 px-4 font-medium text-primary-600">文件名</th>
                  <th className="text-left py-3 px-4 font-medium text-primary-600">类型</th>
                  <th className="text-left py-3 px-4 font-medium text-primary-600">来源</th>
                  <th className="text-left py-3 px-4 font-medium text-primary-600">版本</th>
                  <th className="text-left py-3 px-4 font-medium text-primary-600">记录数</th>
                  <th className="text-left py-3 px-4 font-medium text-primary-600">导入时间</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(source => (
                  <tr key={source.id} className="border-b border-primary-50 hover:bg-primary-50/50">
                    <td className="py-3 px-4 font-medium text-primary-800">{source.name}</td>
                    <td className="py-3 px-4">
                      <span className="badge-primary">
                        {{
                          room: '排练室',
                          band: '乐队',
                          course: '课程',
                        }[source.type]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-primary-600">{source.source}</td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-primary-50 px-2 py-1 rounded text-primary-700">
                        {source.version}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-primary-700">{source.recordCount}</td>
                    <td className="py-3 px-4 text-primary-500 text-xs">
                      {formatDateTime(source.importedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canGenerate && bookings.length === 0 && (
        <div className="card p-8 bg-gradient-to-r from-success-light to-success-light/50 border-success/30 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-success-dark mb-2">
              数据准备就绪
            </h3>
            <p className="text-success-dark/80 mb-6">
              已导入 {rooms.length} 个排练室、{bands.length} 支乐队、{courses.length} 门课程。
              点击下方按钮生成预约并自动检测冲突。
            </p>
            <button
              onClick={handleGenerate}
              className="btn-success px-8 py-3 text-base flex items-center gap-2 mx-auto"
            >
              <Zap className="w-5 h-5" />
              生成预约并检测冲突
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
