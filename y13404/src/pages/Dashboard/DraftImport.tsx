import React, { useState } from 'react';
import { Upload, FileText, User, Clock, Edit3 } from 'lucide-react';
import { getMockDraft } from '@/utils/mockData';

const DraftImport: React.FC = () => {
  const draft = getMockDraft();
  const [teacherNote, setTeacherNote] = useState(draft.teacherNote);
  const [isEditing, setIsEditing] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">历史答案草稿</h3>
              <p className="text-xs text-slate-500">导入并补充现场说明</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>导入于 {formatDate(draft.importTime)}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">草稿内容</span>
          </div>
          <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
            {draft.content}
          </pre>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-slate-700">老叶现场说明</span>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditing ? '完成编辑' : '补充说明'}
            </button>
          </div>

          {isEditing ? (
            <textarea
              value={teacherNote}
              onChange={(e) => setTeacherNote(e.target.value)}
              className="w-full h-48 p-4 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              placeholder="请输入现场说明..."
            />
          ) : (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg p-4">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {teacherNote}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftImport;
