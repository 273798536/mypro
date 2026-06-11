import { useState } from 'react';
import { MessageSquare, Send, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { BoomPoint, PointStatus } from '@/types';
import { useDataStore } from '@/store/useDataStore';
import { getStatusLabel } from '@/utils/unit';

interface RemarkEditorProps {
  point: BoomPoint;
  remarkInput: string;
  setRemarkInput: (value: string) => void;
}

export default function RemarkEditor({ point, remarkInput, setRemarkInput }: RemarkEditorProps) {
  const { updateRemark, updateStatus } = useDataStore();
  const [operator, setOperator] = useState('算法值班人');

  const handleSaveRemark = () => {
    if (!remarkInput.trim()) return;
    updateRemark(point.id, remarkInput.trim(), operator);
    setRemarkInput('');
  };

  const handleStatusChange = (status: PointStatus) => {
    updateStatus(point.id, status);
  };

  const statusButtons: { status: PointStatus; label: string; icon: typeof Clock; className: string }[] = [
    { status: 'pending', label: '待处理', icon: Clock, className: 'btn-warning' },
    { status: 'confirmed', label: '已确认', icon: AlertTriangle, className: 'btn-danger' },
    { status: 'resolved', label: '已解决', icon: CheckCircle, className: 'btn-primary' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        备注编辑
      </h3>

      <div className="glass-card p-3 space-y-3">
        {point.currentRemark && (
          <div className="bg-tech-blue/5 border border-tech-blue/20 rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1">当前备注</div>
            <p className="text-sm text-text-primary">{point.currentRemark}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={operator}
              onChange={e => setOperator(e.target.value)}
              placeholder="操作人"
              className="flex-1 text-sm py-1.5"
            />
          </div>
          <textarea
            value={remarkInput}
            onChange={e => setRemarkInput(e.target.value)}
            placeholder="输入新备注..."
            className="w-full text-sm resize-none h-20"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSaveRemark();
              }
            }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-muted">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Ctrl+Enter 快速保存
            </span>
            <button
              onClick={handleSaveRemark}
              disabled={!remarkInput.trim()}
              className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              保存备注
            </button>
          </div>
        </div>
      </div>

      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
        状态标记
      </h3>

      <div className="flex gap-2">
        {statusButtons.map(({ status, label, icon: Icon, className }) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            className={`flex-1 flex items-center justify-center gap-1.5 ${className} !py-2 text-xs ${
              point.status === status ? 'ring-2 ring-offset-2 ring-offset-bg-deep' : ''
            }`}
            style={{
              boxShadow: point.status === status ? 'none' : undefined,
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="text-xs text-text-muted text-center">
        当前状态: <span className="text-text-primary font-medium">{getStatusLabel(point.status)}</span>
      </div>
    </div>
  );
}
