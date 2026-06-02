import React, { useEffect, useState } from 'react';
import {
  Clock,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  FileText,
  History,
  Image
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { formatDate, formatDateTime } from '../utils/format';

export const Records: React.FC = () => {
  const {
    devices,
    records,
    loading,
    fetchRecords,
    returnDevice,
    extendBorrow
  } = useStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [returnModalRecord, setReturnModalRecord] = useState<string | null>(null);
  const [extendModalRecord, setExtendModalRecord] = useState<string | null>(null);
  const [damageNote, setDamageNote] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [extendAuthor, setExtendAuthor] = useState('');

  useEffect(() => {
    if (records.length === 0) fetchRecords();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleReturn = async () => {
    if (!returnModalRecord) return;
    const success = await returnDevice(
      returnModalRecord,
      damageNote ? { damageNote } : undefined
    );
    if (success) {
      setReturnModalRecord(null);
      setDamageNote('');
    }
  };

  const handleExtend = async () => {
    if (!extendModalRecord || !extendDate || !extendReason || !extendAuthor) return;
    const success = await extendBorrow(extendModalRecord, {
      newExpectedReturnDate: new Date(extendDate).toISOString(),
      reason: extendReason,
      author: extendAuthor
    });
    if (success) {
      setExtendModalRecord(null);
      setExtendDate('');
      setExtendReason('');
      setExtendAuthor('');
    }
  };

  const activeRecords = records.filter(r => r.status === 'borrowed' || r.status === 'overdue');
  const returnedRecords = records.filter(r => r.status === 'returned');

  const renderRecord = (record: typeof records[0], index: number) => {
    const isExpanded = expandedId === record.id;
    const isOverdue = record.status === 'overdue';
    const isActive = record.status === 'borrowed' || record.status === 'overdue';

    return (
      <div
        key={record.id}
        className={`card mb-3 overflow-hidden animate-stagger ${isOverdue ? 'border-rose-200' : ''}`}
        style={{ animationDelay: `${index * 40}ms` }}
      >
        <div
          className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleExpand(record.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                record.status === 'overdue' ? 'bg-rose-500 animate-pulse-slow' :
                record.status === 'borrowed' ? 'bg-blue-500' :
                'bg-emerald-500'
              }`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">{record.deviceName}</span>
                  <StatusBadge type="record" value={record.status} />
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {record.borrower}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(record.borrowDate)} 借出
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    预计 {formatDate(record.expectedReturnDate)} 归还
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {record.versions.length > 0 && (
                <span className="badge bg-amber-100 text-amber-800">
                  <History className="w-3 h-3 mr-1" />
                  {record.versions.length}次变更
                </span>
              )}
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">借出日期</p>
                <p className="text-sm font-medium text-slate-900">{formatDateTime(record.borrowDate)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">预计归还日期</p>
                <p className="text-sm font-medium text-slate-900">{formatDateTime(record.expectedReturnDate)}</p>
              </div>
              {record.actualReturnDate && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">实际归还日期</p>
                  <p className="text-sm font-medium text-slate-900">{formatDateTime(record.actualReturnDate)}</p>
                </div>
              )}
              {record.damageNote && (
                <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                  <p className="text-xs text-rose-600 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    损坏备注（补充证据）
                  </p>
                  <p className="text-sm font-medium text-rose-900">{record.damageNote}</p>
                  {record.damagePhotoUrl && (
                    <img
                      src={record.damagePhotoUrl}
                      alt="损坏照片"
                      className="mt-2 rounded-lg max-w-[200px] max-h-32 object-cover border border-rose-200"
                    />
                  )}
                </div>
              )}
            </div>

            {record.versions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600" />
                  版本追溯（证据保留）
                </h4>
                <div className="space-y-2">
                  {record.versions.map((version) => (
                    <div key={version.id} className="bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-amber-600 font-medium">
                          {version.field === 'expectedReturnDate' ? '归还日期变更' : version.field}
                        </span>
                        <span className="text-xs text-slate-500">{formatDateTime(version.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-700">
                        从 <span className="font-medium">{formatDate(version.oldValue)}</span> 修改为{' '}
                        <span className="font-medium">{formatDate(version.newValue)}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        原因：{version.reason} · 操作人：{version.author}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isActive && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setReturnModalRecord(record.id);
                  }}
                  className="btn btn-primary text-sm"
                >
                  登记归还
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExtendModalRecord(record.id);
                  }}
                  className="btn btn-secondary text-sm flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  延期（保留历史）
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {activeRecords.length > 0 && (
        <div>
          <h3 className="font-serif font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            进行中的借还
            <span className="badge bg-blue-100 text-blue-800">{activeRecords.length}</span>
          </h3>
          <div>{activeRecords.map((record, i) => renderRecord(record, i))}</div>
        </div>
      )}

      {returnedRecords.length > 0 && (
        <div>
          <h3 className="font-serif font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            已归还记录
            <span className="badge bg-slate-100 text-slate-600">{returnedRecords.length}</span>
          </h3>
          <div>{returnedRecords.map((record, i) => renderRecord(record, i + activeRecords.length))}</div>
        </div>
      )}

      {records.length === 0 && (
        <div className="card p-12 text-center text-slate-500">
          暂无借还记录，请先导入样例数据
        </div>
      )}

      <Modal
        isOpen={!!returnModalRecord}
        onClose={() => { setReturnModalRecord(null); setDamageNote(''); }}
        title="登记归还"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">损坏备注（选填，如无损坏留空）</label>
            <textarea
              value={damageNote}
              onChange={(e) => setDamageNote(e.target.value)}
              className="input min-h-[80px] resize-none"
              placeholder="如有损坏请描述损坏情况，将作为补充证据保留在详情中..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setReturnModalRecord(null); setDamageNote(''); }}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleReturn}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '处理中...' : '确认归还'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!extendModalRecord}
        onClose={() => { setExtendModalRecord(null); setExtendDate(''); setExtendReason(''); setExtendAuthor(''); }}
        title="延期归还（历史版本将保留）"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-sm text-amber-800">
            注意：延期操作将保留原始归还日期记录，不会被新版本覆盖。原始超时证据将完整保留。
          </div>
          <div>
            <label className="label">新的预计归还日期</label>
            <input
              type="date"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">延期原因</label>
            <textarea
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              className="input min-h-[80px] resize-none"
              placeholder="请说明延期原因，如：排练日程更新..."
              required
            />
          </div>
          <div>
            <label className="label">操作人</label>
            <input
              type="text"
              value={extendAuthor}
              onChange={(e) => setExtendAuthor(e.target.value)}
              className="input"
              placeholder="请输入您的姓名"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setExtendModalRecord(null); setExtendDate(''); setExtendReason(''); setExtendAuthor(''); }}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleExtend}
              disabled={loading || !extendDate || !extendReason || !extendAuthor}
              className="btn btn-primary"
            >
              {loading ? '处理中...' : '确认延期'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
