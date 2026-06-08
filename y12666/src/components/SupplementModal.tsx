import { useState } from 'react';
import { X, User, MessageSquare, Check } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { missingFieldsForSupplement } from '@/data/mockData';

export default function SupplementModal() {
  const showSupplementModal = useProjectStore((s) => s.showSupplementModal);
  const setShowSupplementModal = useProjectStore((s) => s.setShowSupplementModal);
  const completeSupplement = useProjectStore((s) => s.completeSupplement);
  const setShowSignatureModal = useProjectStore((s) => s.setShowSignatureModal);

  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(missingFieldsForSupplement.map((f) => [f.field, f.value]))
  );
  const [operator, setOperator] = useState('');
  const [comment, setComment] = useState('');

  if (!showSupplementModal) return null;

  const allFilled = missingFieldsForSupplement.every((f) => fields[f.field]?.trim());
  const filledFields = missingFieldsForSupplement.filter((f) => fields[f.field]?.trim()).map((f) => f.field);

  const submit = () => {
    if (!operator.trim()) {
      alert('请填写操作人');
      return;
    }
    completeSupplement(
      filledFields,
      operator,
      comment || `补录了 ${filledFields.length} 个缺失字段`
    );
    setShowSupplementModal(false);
    setShowSignatureModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="panel-card p-5 w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-engineering text-base text-sea-mist font-semibold">
            步骤二：补录缺失数据
          </h3>
          <button onClick={() => setShowSupplementModal(false)} className="text-sea-mist/60 hover:text-sea-mist">
            <X size={18} />
          </button>
        </div>

        <div className="text-xs text-sea-mist/60 mb-3 bg-warning-amber/10 border border-warning-amber/30 rounded p-2.5">
          以下为原始资料中缺失的字段，请补录完整
        </div>

        <div className="space-y-3">
          {missingFieldsForSupplement.map((f) => (
            <div key={f.field}>
              <label className="text-xs text-sea-mist/70 mb-1 block">
                {f.label} <span className="text-alert-orange">*</span>
              </label>
              <input
                type="text"
                value={fields[f.field]}
                onChange={(e) => setFields({ ...fields, [f.field]: e.target.value })}
                placeholder={`请输入${f.label}`}
                className={`w-full bg-ocean-slate/60 border rounded px-3 py-2 text-sm text-sea-mist placeholder:text-sea-mist/40 focus:outline-none focus:border-wake-teal ${
                  fields[f.field]?.trim() ? 'border-wake-teal/40' : 'border-alert-orange/40'
                }`}
              />
            </div>
          ))}

          <div className="pt-2 border-t border-wake-teal/15">
            <div className="flex items-center gap-2">
              <User size={14} className="text-sea-mist/50" />
              <input
                type="text"
                placeholder="操作人 *"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="flex-1 bg-ocean-slate/60 border border-wake-teal/20 rounded px-3 py-2 text-sm text-sea-mist placeholder:text-sea-mist/40 focus:outline-none focus:border-wake-teal"
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-sea-mist/50 mt-2" />
            <textarea
              placeholder="补录说明（选填）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="flex-1 bg-ocean-slate/60 border border-wake-teal/20 rounded px-3 py-2 text-sm text-sea-mist placeholder:text-sea-mist/40 focus:outline-none focus:border-wake-teal resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="text-[11px] text-sea-mist/50">
            已补录 {filledFields.length} / {missingFieldsForSupplement.length} 项
          </span>
          <button
            onClick={submit}
            disabled={!allFilled || !operator.trim()}
            className="btn-primary !py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-40"
          >
            <Check size={12} />
            完成补录
          </button>
        </div>
      </div>
    </div>
  );
}
