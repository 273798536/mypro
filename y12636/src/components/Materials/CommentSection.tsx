import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Material } from '../../types';
import {
  Send, User, Clock, AlertTriangle, CheckCircle, Plus,
} from 'lucide-react';

export default function CommentSection({ material }: { material: Material }) {
  const { addComment, currentUser } = useStore();
  const [text, setText] = useState('');
  const [isSupplementary, setIsSupplementary] = useState(false);

  const submit = () => {
    if (!text.trim()) return;
    addComment(material.id, {
      content: text.trim(),
      author: currentUser.name,
      isSupplementary,
    });
    setText('');
    setIsSupplementary(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-port-border flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">处理意见 ({material.comments.length})</h4>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 text-port-warning">
            <AlertTriangle className="w-3 h-3" />
            {material.comments.filter((c) => c.isSupplementary).length} 补录
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {material.comments.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            暂无处理意见，添加第一条讨论
          </div>
        )}
        {material.comments.map((c, idx) => (
          <div key={c.id} className="panel p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-port-deep flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{c.author}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(c.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {c.isSupplementary && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-port-warning/20 text-port-warning border border-port-warning/50 flex items-center gap-1">
                    <Plus className="w-2.5 h-2.5" /> 补录
                  </span>
                )}
                {idx === material.comments.length - 1 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-port-success/20 text-port-success border border-port-success/50 flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" /> 最新
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-9">
              {c.content}
            </p>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-port-border space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && submit()}
          placeholder="添加处理意见... (Ctrl+Enter 发送)"
          className="input-field w-full text-sm resize-none h-24"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isSupplementary}
              onChange={(e) => setIsSupplementary(e.target.checked)}
              className="w-3.5 h-3.5 accent-port-warning"
            />
            标记为补录意见（事后补充记录）
          </label>
          <button
            onClick={submit}
            disabled={!text.trim()}
            className={`btn-primary flex items-center gap-1.5 text-sm ${
              !text.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
