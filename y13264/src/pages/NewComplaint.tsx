import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Calendar, FileText, Upload, Loader, Droplets } from 'lucide-react';
import { useComplaintStore } from '../store/useComplaintStore';
import { DuplicateWarning } from '../components/DuplicateWarning';
import { MergeConfirmModal } from '../components/MergeConfirmModal';
import { Complaint } from '../utils/types';
import { DEFAULT_OPERATOR } from '../utils/constants';

export function NewComplaint() {
  const navigate = useNavigate();
  const { addComplaint, mergeComplaints, markSameStreet, addAttachment } = useComplaintStore();
  
  const [formData, setFormData] = useState({
    street: '',
    complainant: '',
    complaintTime: new Date().toISOString().slice(0, 16),
    description: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateData, setDuplicateData] = useState<{
    duplicate: Complaint;
    newData: { street: string; complainant: string; description: string };
  } | null>(null);
  
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeData, setMergeData] = useState<{
    newComplaint: Complaint;
    existingComplaints: Complaint[];
  } | null>(null);
  
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [newComplaintId, setNewComplaintId] = useState<string>('');

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.street.trim()) newErrors.street = '请填写街口位置';
    if (!formData.complainant.trim()) newErrors.complainant = '请填写投诉人';
    if (!formData.complaintTime) newErrors.complaintTime = '请选择投诉时间';
    if (!formData.description.trim()) newErrors.description = '请填写积淤情况描述';
    else if (formData.description.length < 10) newErrors.description = '请详细描述情况（至少10字）';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const complaintTime = new Date(formData.complaintTime).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-');

      const result = addComplaint({
        street: formData.street,
        complainant: formData.complainant,
        complaintTime,
        description: formData.description,
        status: 'pending',
        mergeStatus: 'none',
        mergedFrom: [],
      });

      if (!result.success && result.duplicate) {
        setDuplicateData({
          duplicate: result.duplicate,
          newData: {
            street: formData.street,
            complainant: formData.complainant,
            description: formData.description,
          },
        });
        setShowDuplicateWarning(true);
        setIsSubmitting(false);
        return;
      }

      const { complaints } = useComplaintStore.getState();
      const newComplaint = complaints[complaints.length - 1];
      setNewComplaintId(newComplaint.id);

      if (uploadingFile) {
        await addAttachment(newComplaint.id, uploadingFile);
      }

      if (result.sameStreet && result.sameStreet.length > 0) {
        setMergeData({
          newComplaint,
          existingComplaints: result.sameStreet,
        });
        setShowMergeModal(true);
        setIsSubmitting(false);
        return;
      }

      navigate(`/complaint/${newComplaint.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMerge = (targetId: string, sourceIds: string[], reason: string) => {
    mergeComplaints(targetId, sourceIds, reason);
    setShowMergeModal(false);
    navigate(`/complaint/${targetId}`);
  };

  const handleKeepSeparate = (group: Complaint[], reason: string) => {
    const groupId = `group-${Date.now()}`;
    markSameStreet(group.map(c => c.id), groupId);
    setShowMergeModal(false);
    navigate(`/complaint/${newComplaintId}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <header className="bg-gradient-to-r from-slate-800 via-blue-900 to-slate-800 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
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
                  新建投诉记录
                </h1>
                <p className="text-xs text-blue-200">雨水口积淤公示清单</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">填写投诉信息</h2>
            <p className="text-sm text-slate-500 mt-1">
              请准确填写以下信息，系统将自动检测重复提交和同街口多单情况
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  街口位置 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="例如：幸福路与阳光大道交叉口东南角"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    errors.street ? 'border-rose-300' : 'border-slate-300'
                  }`}
                />
                {errors.street && (
                  <p className="text-xs text-rose-500 mt-1">{errors.street}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  投诉人 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.complainant}
                  onChange={(e) => setFormData({ ...formData, complainant: e.target.value })}
                  placeholder="例如：张女士"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    errors.complainant ? 'border-rose-300' : 'border-slate-300'
                  }`}
                />
                {errors.complainant && (
                  <p className="text-xs text-rose-500 mt-1">{errors.complainant}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                投诉时间 <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.complaintTime}
                onChange={(e) => setFormData({ ...formData, complaintTime: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  errors.complaintTime ? 'border-rose-300' : 'border-slate-300'
                }`}
              />
              {errors.complaintTime && (
                <p className="text-xs text-rose-500 mt-1">{errors.complaintTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                积淤情况描述 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请详细描述积淤情况，包括积水深度、堵塞原因、影响范围等..."
                rows={5}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all ${
                  errors.description ? 'border-rose-300' : 'border-slate-300'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.description ? (
                  <p className="text-xs text-rose-500">{errors.description}</p>
                ) : (
                  <span className="text-xs text-slate-400">
                    请提供足够详细的信息，便于后续处理和追溯
                  </span>
                )}
                <span className="text-xs text-slate-400">{formData.description.length} 字</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-500" />
                上传附件（可选）
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                {uploadingFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium text-slate-700">{uploadingFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(uploadingFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setUploadingFile(null)}
                      className="text-rose-500 hover:text-rose-600 text-sm"
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-1">点击选择文件</p>
                    <p className="text-xs text-slate-400">
                      支持图片、PDF、Word文档，系统将自动检测重复附件
                    </p>
                  </label>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-medium text-blue-800 mb-2">提交前请注意</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 系统会自动检测24小时内相同街口的相似投诉，避免重复统计</li>
                <li>• 同一街口的多条投诉会提示归并或保留独立记录</li>
                <li>• 附件会基于内容哈希自动去重，相同文件不会重复统计</li>
              </ul>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  提交中...
                </>
              ) : (
                '提交投诉'
              )}
            </button>
          </div>
        </div>
      </main>

      {duplicateData && (
        <DuplicateWarning
          isOpen={showDuplicateWarning}
          onClose={() => {
            setShowDuplicateWarning(false);
            setDuplicateData(null);
          }}
          duplicate={duplicateData.duplicate}
          newData={duplicateData.newData}
        />
      )}

      {mergeData && (
        <MergeConfirmModal
          isOpen={showMergeModal}
          onClose={() => {
            setShowMergeModal(false);
            setMergeData(null);
            navigate(`/complaint/${newComplaintId}`);
          }}
          onMerge={handleMerge}
          onKeepSeparate={handleKeepSeparate}
          newComplaint={mergeData.newComplaint}
          existingComplaints={mergeData.existingComplaints}
        />
      )}
    </div>
  );
}
