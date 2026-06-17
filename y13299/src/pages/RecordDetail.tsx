import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  MapPin,
  FileText,
  Clock,
  GripVertical,
  Paperclip,
  Loader2,
  Edit3,
  Upload,
} from 'lucide-react';
import { useSeatStore } from '../store/useSeatStore';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';
import JudgmentModal from '../components/JudgmentModal';
import type { RecordStatus, MaterialAttachment } from '../shared/types';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [judgmentOpen, setJudgmentOpen] = useState(false);

  const {
    currentRecord,
    loading,
    history,
    fetchRecordById,
    fetchHistory,
    updateJudgment,
    addAttachment,
  } = useSeatStore();

  useEffect(() => {
    if (id) {
      fetchRecordById(id);
      fetchHistory(id);
    }
  }, [id, fetchRecordById, fetchHistory]);

  const attachmentsByBatch = useMemo(() => {
    const groups: Record<string, MaterialAttachment[]> = {};
    currentRecord?.attachments.forEach((a) => {
      if (!groups[a.batchId]) groups[a.batchId] = [];
      groups[a.batchId].push(a);
    });
    return groups;
  }, [currentRecord]);

  const handleJudgment = async (newStatus: RecordStatus, reason: string, markAsException?: boolean) => {
    if (!id) return false;
    return updateJudgment(id, newStatus, reason, markAsException);
  };

  const handleAddAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      const name = file.name;
      const type = file.name.split('.').pop() || 'unknown';
      await addAttachment(id, { name, type });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading && !currentRecord) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!currentRecord) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 mb-4">记录不存在</p>
        <button
          onClick={() => navigate('/')}
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回清单列表
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 animate-fadeIn">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3 flex-wrap">
            <div>
              <div className="text-xs text-gray-500 font-mono mb-1">{currentRecord.code}</div>
              <h2 className="text-xl font-serif font-semibold text-text-dark">
                {currentRecord.locationName}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <MapPin className="w-3.5 h-3.5" />
                {currentRecord.street}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={currentRecord.status} />
            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <Clock className="w-3.5 h-3.5" />
              最近操作：{currentRecord.latestJudgmentAt || currentRecord.updatedAt}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5">
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 animate-slideIn">
            <div className="flex items-center gap-2 mb-3">
              <GripVertical className="w-4 h-4 text-primary" />
              <h3 className="font-serif font-semibold text-text-dark">GIS点位</h3>
              <span className="text-xs text-gray-500 font-mono">
                ({currentRecord.points.length})
              </span>
            </div>
            <div className="space-y-3">
              {currentRecord.points.map((point, idx) => (
                <div
                  key={point.id}
                  className={clsx(
                    'relative border rounded-lg p-3 text-sm',
                    point.isAbnormal
                      ? 'bg-accent/5 border-accent/30'
                      : 'bg-gray-50 border-gray-200',
                  )}
                  style={{ animation: `fadeIn 0.3s ease-in-out ${idx * 50}ms both` }}
                >
                  {point.isAbnormal && point.abnormalNote && (
                    <span className="absolute -top-2 -right-2 text-[10px] bg-accent text-white px-2 py-0.5 rounded shadow">
                      {point.abnormalNote}
                    </span>
                  )}
                  <div className="font-mono text-xs text-gray-700 mb-1">
                    {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>来源：{point.source}</div>
                    <div>批次：{point.batchId}</div>
                    <div className="font-mono">{point.importedAt}</div>
                  </div>
                </div>
              ))}
              {currentRecord.points.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">暂无GIS点位</p>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 animate-slideIn">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="w-4 h-4 text-primary" />
              <h3 className="font-serif font-semibold text-text-dark">材料附件</h3>
              <span className="text-xs text-gray-500 font-mono">
                ({currentRecord.attachments.length})
              </span>
            </div>
            {Object.keys(attachmentsByBatch).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">暂无附件材料</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(attachmentsByBatch).map(([batch, files], bIdx) => (
                  <div
                    key={batch}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                    style={{ animation: `fadeIn 0.3s ease-in-out ${bIdx * 80}ms both` }}
                  >
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 font-mono">
                        批次：{batch}
                      </span>
                      <span className="text-xs text-gray-500">{files.length} 份</span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {files.map((att, fIdx) => (
                        <li
                          key={att.id}
                          className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                          style={{ animation: `fadeIn 0.2s ease-in-out ${fIdx * 30}ms both` }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-primary/70 flex-shrink-0" />
                            <span className="truncate text-text-dark">{att.name}</span>
                            {att.note && (
                              <span className="text-xs text-gray-500">({att.note})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono uppercase">
                              {att.type}
                            </span>
                            <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                              {att.uploadedAt}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 animate-slideIn h-full">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-serif font-semibold text-text-dark">操作时间线</h3>
            </div>
            <Timeline entries={history} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
        <p className="text-sm text-gray-500">
          材料完整度：
          <span
            className={clsx(
              'font-mono font-semibold ml-1',
              currentRecord.materialCompleteness >= 80
                ? 'text-primary'
                : currentRecord.materialCompleteness >= 50
                ? 'text-yellow-700'
                : 'text-accent',
            )}
          >
            {currentRecord.materialCompleteness}%
          </span>
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={handleAddAttachment}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            补录附件
          </button>
          <button
            onClick={() => setJudgmentOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            改判
          </button>
        </div>
      </div>

      <JudgmentModal
        open={judgmentOpen}
        onClose={() => setJudgmentOpen(false)}
        onConfirm={handleJudgment}
        currentStatus={currentRecord.status}
        recordCode={currentRecord.code}
      />
    </div>
  );
}
