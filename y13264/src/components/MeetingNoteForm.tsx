import { useState } from 'react';
import { FileText, Users, Calendar, AlertTriangle, Check } from 'lucide-react';
import { Modal } from './Modal';
import { DEFAULT_OPERATOR } from '../utils/constants';

interface MeetingNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: {
    meetingTime: string;
    attendees: string;
    content: string;
    impactDescription: string;
    operator: string;
  }) => void;
}

export function MeetingNoteForm({ isOpen, onClose, onSubmit }: MeetingNoteFormProps) {
  const [formData, setFormData] = useState({
    meetingTime: new Date().toISOString().slice(0, 16),
    attendees: '',
    content: '',
    impactDescription: '',
    operator: DEFAULT_OPERATOR,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.meetingTime) newErrors.meetingTime = '请选择会议时间';
    if (!formData.attendees.trim()) newErrors.attendees = '请填写参会人员';
    if (!formData.content.trim()) newErrors.content = '请填写会议内容';
    if (!formData.impactDescription.trim()) {
      newErrors.impactDescription = '请填写变更影响说明';
    } else if (formData.impactDescription.length < 10) {
      newErrors.impactDescription = '请详细说明此纪要改变了哪些判断（至少10字）';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    
    onSubmit({
      ...formData,
      meetingTime: new Date(formData.meetingTime).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/\//g, '-'),
    });
    
    setFormData({
      meetingTime: new Date().toISOString().slice(0, 16),
      attendees: '',
      content: '',
      impactDescription: '',
      operator: DEFAULT_OPERATOR,
    });
    setErrors({});
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="补录会议纪要" size="lg">
      <div className="space-y-5">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 mb-1">重要提示</h4>
            <p className="text-sm text-amber-700">
              会议纪要是重要的决策依据，请准确填写"变更影响说明"，
              说明此纪要改变了哪些原有判断或决策。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              会议时间 <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.meetingTime}
              onChange={(e) => setFormData({ ...formData, meetingTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.meetingTime && (
              <p className="text-xs text-rose-500 mt-1">{errors.meetingTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              参会人员 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              placeholder="例如：李主任、王工、赵队"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.attendees && (
              <p className="text-xs text-rose-500 mt-1">{errors.attendees}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            会议内容 <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="请详细记录会议讨论内容和决议..."
            rows={4}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          {errors.content && (
            <p className="text-xs text-rose-500 mt-1">{errors.content}</p>
          )}
          <p className="text-xs text-slate-400 mt-1 text-right">
            {formData.content.length} 字
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            变更影响说明 <span className="text-rose-500">*</span>
          </label>
          <div className="border-2 border-rose-200 rounded-xl overflow-hidden">
            <div className="bg-rose-50 px-4 py-2 border-b border-rose-200">
              <p className="text-xs text-rose-700">
                <Check className="w-3.5 h-3.5 inline mr-1" />
                此字段必须填写，说明此纪要改变了哪些判断
              </p>
            </div>
            <textarea
              value={formData.impactDescription}
              onChange={(e) => setFormData({ ...formData, impactDescription: e.target.value })}
              placeholder="例如：原计划本周六处理，改为明日上午处理，优先级从普通提升为紧急..."
              rows={3}
              className="w-full px-4 py-3 border-0 focus:ring-0 resize-none"
            />
          </div>
          {errors.impactDescription && (
            <p className="text-xs text-rose-500 mt-1">{errors.impactDescription}</p>
          )}
          <p className="text-xs text-slate-400 mt-1 text-right">
            {formData.impactDescription.length} 字
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            记录人
          </label>
          <input
            type="text"
            value={formData.operator}
            onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            保存纪要
          </button>
        </div>
      </div>
    </Modal>
  );
}
