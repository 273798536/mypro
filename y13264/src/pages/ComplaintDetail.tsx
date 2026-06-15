import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, User, Calendar, FileText, Upload, 
  Plus, Clock, Loader, Eye, CheckCircle, Users,
  AlertTriangle, Droplets, Edit3, Trash2, GitMerge
} from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore';
import { StatusBadge, MergeStatusBadge } from '../components/StatusBadge';
import { MeetingNoteForm } from '../components/MeetingNoteForm';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { AttachmentList } from '../components/AttachmentList';
import { HistoryLogList } from '../components/HistoryLogList';
import { ConfirmModal } from '../components/Modal';
import { ComplaintStatus } from '../utils/types';
import { STATUS_LABELS, DEFAULT_OPERATOR } from '../utils/constants';
import { cn } from '../lib/utils';

const statusFlow: ComplaintStatus[] = ['pending', 'processing', 'for_publication', 'publicized'];

export function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { 
    complaints, 
    changeStatus, 
    addMeetingNote, 
    addAttachment,
    deleteComplaint,
    mergeComplaints,
    checkSameStreet,
  } = useComplaintStore();

  const complaint = useMemo(() => complaints.find(c => c.id === id), [complaints, id]);
  
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);

  if (!complaint) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">记录不存在</h2>
          <p className="text-slate-500 mb-4">该投诉记录可能已被删除或不存在</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const currentIndex = statusFlow.indexOf(complaint.status);
  const nextStatus = statusFlow[currentIndex + 1];
  const prevStatus = statusFlow[currentIndex - 1];

  const sameStreetComplaints = checkSameStreet(complaint.street).filter(c => c.id !== complaint.id);

  const requireConfirmationForStatus = (status: ComplaintStatus): boolean => {
    return status === 'for_publication' || status === 'publicized';
  };

  const handleStatusChange = (newStatus: ComplaintStatus) => {
    setTargetStatus(newStatus);
    setShowStatusModal(true);
  };

  const confirmStatusChange = (reason: string, nextStep: string) => {
    if (targetStatus) {
      changeStatus(complaint.id, targetStatus, reason, nextStep);
      setShowStatusModal(false);
      setTargetStatus(null);
    }
  };

  const handleAddMeetingNote = (note: {
    meetingTime: string;
    attendees: string;
    content: string;
    impactDescription: string;
    operator: string;
  }) => {
    addMeetingNote(complaint.id, { ...note, complaintId: complaint.id });
    setShowMeetingForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await addAttachment(complaint.id, file);
      if (result.isDuplicate) {
        setUploadError('该附件已存在，不会重复统计');
      }
    } catch (error) {
      setUploadError('上传失败，请重试');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = () => {
    deleteComplaint(complaint.id);
    navigate('/');
  };

  const handleMerge = () => {
    if (sameStreetComplaints.length > 0) {
      mergeComplaints(
        complaint.id,
        sameStreetComplaints.map(c => c.id),
        '手动归并同街口多单'
      );
      setShowMergeModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <header className="bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                    投诉详情
                  </h1>
                  <p className="text-xs text-blue-200">雨水口积淤公示清单</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 rounded-lg transition-colors"
                title="删除记录"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{complaint.street}</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={complaint.status} />
                    <MergeStatusBadge status={complaint.mergeStatus} />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-slate-500 flex items-center gap-2 mb-1">
                      <User className="w-4 h-4" />
                      投诉人
                    </label>
                    <p className="text-lg font-medium text-slate-800">{complaint.complainant}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4" />
                      投诉时间
                    </label>
                    <p className="text-lg font-medium text-slate-800">{complaint.complaintTime}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-500 flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" />
                    积淤情况描述
                  </label>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {complaint.description}
                    </p>
                  </div>
                </div>

                {complaint.mergedFrom.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <h4 className="font-medium text-indigo-800 flex items-center gap-2 mb-2">
                      <GitMerge className="w-4 h-4" />
                      已归并记录
                    </h4>
                    <p className="text-sm text-indigo-700">
                      本记录已归并以下投诉：{complaint.mergedFrom.join(', ')}
                    </p>
                  </div>
                )}

                {sameStreetComplaints.length > 0 && complaint.mergeStatus === 'same_street' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h4 className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      同街口关联记录
                    </h4>
                    <p className="text-sm text-amber-700 mb-3">
                      该街口还有 {sameStreetComplaints.length} 条相关投诉：
                    </p>
                    <div className="space-y-2">
                      {sameStreetComplaints.map(c => (
                        <div 
                          key={c.id}
                          className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-700">{c.complainant}</p>
                            <p className="text-xs text-slate-500">{c.complaintTime}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={c.status} showIcon={false} />
                            <button
                              onClick={() => navigate(`/complaint/${c.id}`)}
                              className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4 text-amber-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleMerge}
                      className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <GitMerge className="w-4 h-4" />
                      归并为一条记录
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  会议纪要补录
                  <span className="text-xs text-slate-400 font-normal">({complaint.meetingNotes.length}条)</span>
                </h3>
                <button
                  onClick={() => setShowMeetingForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  补录纪要
                </button>
              </div>
              <div className="p-6">
                {complaint.meetingNotes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无会议纪要</p>
                    <p className="text-xs text-slate-400 mt-1">
                      点击上方按钮补录会议决策记录
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {complaint.meetingNotes.map((note, index) => (
                      <div 
                        key={note.id} 
                        className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-800">
                            纪要 #{index + 1}
                          </span>
                          <span className="text-xs text-slate-500">{note.createdAt}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-slate-500">会议时间：</span>
                            <span className="text-slate-700">{note.meetingTime}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">参会人员：</span>
                            <span className="text-slate-700">{note.attendees}</span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-slate-500 mb-1">会议内容：</p>
                          <p className="text-slate-700">{note.content}</p>
                        </div>
                        <div className="border-2 border-rose-200 bg-rose-50 rounded-lg p-3">
                          <p className="text-sm text-rose-600 font-medium mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            变更影响说明
                          </p>
                          <p className="text-sm text-rose-700">{note.impactDescription}</p>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-right">
                          记录人：{note.operator}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  附件资料
                  <span className="text-xs text-slate-400 font-normal">
                    ({complaint.attachments.filter(a => !a.isDuplicate).length}个有效文件)
                  </span>
                </h3>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  上传附件
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    disabled={isUploading}
                  />
                </label>
              </div>
              <div className="p-6">
                {uploadError && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {uploadError}
                  </div>
                )}
                {isUploading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <AttachmentList attachments={complaint.attachments} />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">状态流转</h3>
              </div>
              <div className="p-6">
                <div className="relative">
                  {statusFlow.map((status, index) => {
                    const isActive = complaint.status === status;
                    const isPast = currentIndex > index;
                    const isFuture = currentIndex < index;
                    
                    return (
                      <div key={status} className="relative mb-4 last:mb-0">
                        {index < statusFlow.length - 1 && (
                          <div className={cn(
                            'absolute left-[11px] top-6 w-0.5 h-12',
                            isPast ? 'bg-emerald-400' : 'bg-slate-200'
                          )} />
                        )}
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                            isActive && 'bg-blue-500 border-blue-500 ring-4 ring-blue-100',
                            isPast && 'bg-emerald-500 border-emerald-500',
                            isFuture && 'bg-white border-slate-300'
                          )}>
                            {isPast && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            {isActive && <Clock className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              'font-medium',
                              isActive ? 'text-blue-600' : isPast ? 'text-emerald-600' : 'text-slate-400'
                            )}>
                              {STATUS_LABELS[status]}
                            </p>
                            {isActive && (
                              <div className="mt-3 space-y-2">
                                {nextStatus && (
                                  <button
                                    onClick={() => handleStatusChange(nextStatus)}
                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    推进至 {STATUS_LABELS[nextStatus]}
                                  </button>
                                )}
                                {prevStatus && (
                                  <button
                                    onClick={() => handleStatusChange(prevStatus)}
                                    className="w-full py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                  >
                                    退回至 {STATUS_LABELS[prevStatus]}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">信息摘要</h3>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">创建时间</span>
                  <span className="text-slate-700 font-medium">{complaint.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">更新时间</span>
                  <span className="text-slate-700 font-medium">{complaint.updatedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">操作记录</span>
                  <span className="text-slate-700 font-medium">{complaint.historyLogs.length} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">附件数量</span>
                  <span className="text-slate-700 font-medium">
                    {complaint.attachments.filter(a => !a.isDuplicate).length} 个
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">会议纪要</span>
                  <span className="text-slate-700 font-medium">{complaint.meetingNotes.length} 条</span>
                </div>
              </div>
            </div>

            <HistoryLogList logs={complaint.historyLogs} />
          </div>
        </div>
      </main>

      <MeetingNoteForm
        isOpen={showMeetingForm}
        onClose={() => setShowMeetingForm(false)}
        onSubmit={handleAddMeetingNote}
      />

      {targetStatus && (
        <StatusChangeModal
          isOpen={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setTargetStatus(null);
          }}
          onConfirm={confirmStatusChange}
          currentStatus={complaint.status}
          newStatus={targetStatus}
          requireConfirmation={requireConfirmationForStatus(targetStatus)}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="确认删除该记录？"
        message="此操作将永久删除该投诉记录，包括所有附件、会议纪要和操作历史。删除后无法恢复。"
        confirmText="确认删除"
        variant="danger"
      />
    </div>
  );
}
