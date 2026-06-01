import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Download, BarChart3, AlertTriangle, Plus } from 'lucide-react';
import { TimelineView } from '../components/board/TimelineView';
import { ConflictPanel } from '../components/conflict/ConflictPanel';
import { useDataStore } from '../store/useDataStore';
import { useBookingStore } from '../store/useBookingStore';
import { useConflictStore } from '../store/useConflictStore';
import { ExportDialog } from '../components/review/ExportDialog';
import { useState } from 'react';

export function BookingBoard() {
  const navigate = useNavigate();
  const [showExport, setShowExport] = useState(false);

  const { rooms, bands, courses, loadFromStorage } = useDataStore();
  const { bookings, generateBookings } = useBookingStore();
  const {
    conflicts,
    detectConflicts,
    markResolved,
    getUnresolvedCount,
  } = useConflictStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const unresolvedCount = getUnresolvedCount();

  const handleDetectConflicts = () => {
    detectConflicts();
  };

  const handleGenerate = () => {
    if (window.confirm('重新生成预约将覆盖现有数据，是否继续？')) {
      generateBookings();
    }
  };

  const handleResolveConflict = (conflictId: string) => {
    markResolved(conflictId);
  };

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh">
        <div className="card p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-primary-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-primary-900 mb-2">
            暂无预约数据
          </h2>
          <p className="text-primary-600 mb-8">
            请先导入排练室表、乐队名单和课程安排，然后生成预约数据。
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/import')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              前往导入数据
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-900">
            预约看板
          </h1>
          <p className="text-primary-600 mt-1">
            共 {bookings.length} 条预约
            {unresolvedCount > 0 && (
              <span className="ml-2 text-conflict">
                · {unresolvedCount} 个待处理冲突
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重新生成
          </button>
          <button
            onClick={handleDetectConflicts}
            className="btn-secondary flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            重新检测冲突
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出日程
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TimelineView
            bookings={bookings}
            rooms={rooms}
            bands={bands}
            conflicts={conflicts}
          />
        </div>
        <div>
          <ConflictPanel
            conflicts={conflicts}
            rooms={rooms}
            bands={bands}
            courses={courses}
            onResolve={handleResolveConflict}
          />
        </div>
      </div>

      {showExport && (
        <ExportDialog
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
