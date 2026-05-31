import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { Feedback } from '../types';

interface FeedbackFormProps {
  feedback?: Feedback;
  onClose: () => void;
  onSubmit?: () => void;
}

interface FormData {
  seatAreaId: string;
  segmentId: string;
  content: string;
  note: string;
}

export function FeedbackForm({ feedback, onClose, onSubmit }: FeedbackFormProps) {
  const { seatAreas, trackSegments, addFeedback, updateFeedback, currentConcertId } = useFeedbackStore();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    defaultValues: {
      seatAreaId: feedback?.seatAreaId || '',
      segmentId: feedback?.segmentId || '',
      content: feedback?.content || '',
      note: feedback?.note || '',
    },
  });

  useEffect(() => {
    if (feedback) {
      reset({
        seatAreaId: feedback.seatAreaId || '',
        segmentId: feedback.segmentId || '',
        content: feedback.content,
        note: feedback.note || '',
      });
    }
  }, [feedback, reset]);

  const handleFormSubmit = (data: FormData) => {
    if (feedback) {
      updateFeedback(feedback.id, {
        seatAreaId: data.seatAreaId || undefined,
        segmentId: data.segmentId || undefined,
        content: data.content,
        note: data.note || undefined,
      });
    } else {
      addFeedback({
        concertId: currentConcertId,
        seatAreaId: data.seatAreaId || undefined,
        segmentId: data.segmentId || undefined,
        content: data.content,
        note: data.note || undefined,
      });
    }
    onSubmit?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
            {feedback ? '编辑反馈' : '新增反馈'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              座位区域
            </label>
            <select
              {...register('seatAreaId')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">请选择区域</option>
              {seatAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {errors.seatAreaId && (
              <p className="mt-1 text-sm text-red-600">{errors.seatAreaId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              曲目段落
            </label>
            <select
              {...register('segmentId')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">请选择段落</option>
              {trackSegments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name} {segment.status === 'pending' && '(待确认)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              反馈内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('content', { required: '请输入反馈内容' })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="请描述观众反馈的音效问题..."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              备注
            </label>
            <textarea
              {...register('note')}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              placeholder="补充说明信息，如具体座位号、时间点等..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
            >
              {feedback ? '保存修改' : '提交反馈'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
