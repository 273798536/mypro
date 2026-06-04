import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit3, Calendar, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { AccidentRecord, STATUS_LABELS, STATUS_COLORS, STATUS_TEXT_COLORS } from '@/types';
import { useStore } from '@/store';

interface RecordCardProps {
  record: AccidentRecord;
}

export default function RecordCard({ record }: RecordCardProps) {
  const deleteRecord = useStore((state) => state.deleteRecord);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteRecord(record.id);
  };

  return (
    <Link
      to={`/editor/${record.id}`}
      className="group block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <span className="text-sm">示意图预览</span>
          </div>
        </div>
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${STATUS_COLORS[record.status]}`}
          >
            {getStatusIcon(record.status)}
            {STATUS_LABELS[record.status]}
          </span>
        </div>
        {record.issues.length > 0 && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
              <AlertCircle className="w-3 h-3" />
              {record.issues.length} 个问题
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {record.title}
        </h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {record.description || '暂无描述'}
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(record.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{record.elements.length} 个元素</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
          <div
            className={`flex-1 text-sm font-medium ${STATUS_TEXT_COLORS[record.status]}`}
          >
            {record.elements.length === 0
              ? '点击开始编辑'
              : `${record.elements.length} 个标注元素`}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {showDeleteConfirm ? (
              <>
                <button
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="确认删除"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  title="取消"
                >
                  <span className="text-xs">✕</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  title="编辑"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
