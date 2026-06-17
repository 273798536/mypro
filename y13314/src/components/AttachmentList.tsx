import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  FileText, FileImage, FileSpreadsheet, 
  Link2, Link2Off, Clock, Plus, 
  CheckCircle, AlertCircle, Paperclip 
} from 'lucide-react';
import type { Attachment } from '@/types';

const getFileIcon = (type: Attachment['type']) => {
  switch (type) {
    case 'document': return FileText;
    case 'image': return FileImage;
    case 'data': return FileSpreadsheet;
    default: return FileText;
  }
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface AttachmentListProps {
  sampleId: string;
}

export const AttachmentList = ({ sampleId }: AttachmentListProps) => {
  const { 
    getSampleAttachments, 
    getSampleConclusion, 
    linkAttachmentToConclusion,
    addLateAttachment 
  } = useAppStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAttachment, setNewAttachment] = useState({
    name: '',
    type: 'document' as Attachment['type'],
    description: '',
  });

  const attachments = getSampleAttachments(sampleId);
  const conclusion = getSampleConclusion(sampleId);

  const handleLinkAttachment = (attachmentId: string) => {
    if (conclusion) {
      linkAttachmentToConclusion(attachmentId, conclusion.id);
    }
  };

  const handleAddLateAttachment = () => {
    if (!newAttachment.name.trim()) return;
    
    addLateAttachment(sampleId, {
      name: newAttachment.name,
      type: newAttachment.type,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: '当前用户',
      description: newAttachment.description,
    });
    
    setNewAttachment({ name: '', type: 'document', description: '' });
    setShowAddForm(false);
  };

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-200 flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-navy-800 flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-amber-500" />
          附件管理
          {attachments.length > 0 && (
            <span className="text-sm font-normal text-navy-500">
              ({attachments.length} 个附件)
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-secondary text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          补录晚到附件
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-start gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-800">补录晚到附件</div>
              <div className="text-xs text-amber-600">
                补录的附件将自动标记为【晚到附件】，并可与结论关联
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-500 block mb-1">附件名称</label>
              <input
                type="text"
                value={newAttachment.name}
                onChange={(e) => setNewAttachment({ ...newAttachment, name: e.target.value })}
                placeholder="请输入附件名称"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-navy-500 block mb-1">附件类型</label>
              <select
                value={newAttachment.type}
                onChange={(e) => setNewAttachment({ ...newAttachment, type: e.target.value as Attachment['type'] })}
                className="input-field text-sm"
              >
                <option value="document">文档</option>
                <option value="image">图片</option>
                <option value="data">数据文件</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-navy-500 block mb-1">附件说明</label>
              <input
                type="text"
                value={newAttachment.description}
                onChange={(e) => setNewAttachment({ ...newAttachment, description: e.target.value })}
                placeholder="请输入附件说明（可选）"
                className="input-field text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowAddForm(false)}
              className="btn text-sm"
            >
              取消
            </button>
            <button
              onClick={handleAddLateAttachment}
              className="btn btn-primary text-sm"
            >
              确认补录
            </button>
          </div>
        </div>
      )}

      {conclusion && (
        <div className="px-6 py-3 bg-navy-50 border-b border-navy-100">
          <div className="flex items-center gap-2 text-xs text-navy-500">
            <Link2 className="w-3.5 h-3.5" />
            <span>当前结论：</span>
            <span className={`font-medium ${
              conclusion.finalResult === 'approve' ? 'text-moss-600' :
              conclusion.finalResult === 'reject' ? 'text-rust-600' : 'text-sky-600'
            }`}>
              {conclusion.finalResult === 'approve' ? '批准' : 
               conclusion.finalResult === 'reject' ? '拒绝' : '挂起'}
            </span>
            <span className="text-navy-400">|</span>
            <span>已关联附件：{conclusion.referencedAttachmentIds.length} 个</span>
            {!conclusion.isReferenceComplete && conclusion.missingReferences.length > 0 && (
              <>
                <span className="text-navy-400">|</span>
                <span className="text-rust-600">
                  缺失引用：{conclusion.missingReferences.join('、')}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-navy-100 max-h-[400px] overflow-y-auto scrollbar-thin">
        {attachments.length === 0 ? (
          <div className="p-8 text-center">
            <Paperclip className="w-8 h-8 text-navy-300 mx-auto mb-2" />
            <p className="text-navy-500 text-sm">暂无附件</p>
          </div>
        ) : (
          attachments.map((att, idx) => {
            const FileIcon = getFileIcon(att.type);
            const isLinked = conclusion?.referencedAttachmentIds.includes(att.id);
            const isLate = att.isLateArrival;
            
            return (
              <div 
                key={att.id} 
                className={`p-4 hover:bg-navy-50 transition-colors animate-fade-in`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 border ${
                    isLate ? 'bg-amber-50 border-amber-200' : 'bg-navy-50 border-navy-200'
                  }`}>
                    <FileIcon className={`w-5 h-5 ${isLate ? 'text-amber-600' : 'text-navy-500'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-navy-800 truncate">
                        {att.name}
                      </span>
                      {isLate && (
                        <span className="tag tag-amber flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          晚到附件
                        </span>
                      )}
                      {isLinked && (
                        <span className="tag tag-moss flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          已关联结论
                        </span>
                      )}
                    </div>
                    
                    {att.description && (
                      <p className="text-sm text-navy-600 mb-2">{att.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-navy-500">
                      <span>上传：{formatDate(att.uploadDate)}</span>
                      <span>上传人：{att.uploadedBy}</span>
                      {att.linkedConclusionId && (
                        <span className="text-moss-600 flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          已绑定结论
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {conclusion && !isLinked && (
                    <button
                      onClick={() => handleLinkAttachment(att.id)}
                      className="btn text-sm flex items-center gap-1.5 text-xs px-2 py-1"
                      title="关联到当前结论"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      关联结论
                    </button>
                  )}
                  {conclusion && isLinked && (
                    <button
                      className="btn text-sm flex items-center gap-1.5 text-xs px-2 py-1 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                      已关联
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
