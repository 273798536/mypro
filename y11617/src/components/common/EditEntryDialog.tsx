import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useCashflowStore } from '../../store/useCashflowStore';
import {
  CASHFLOW_TYPE_LABELS,
  PRIORITY_LABELS
} from '../../types';
import type { CashflowEntry, CashflowType, FlowDirection, Priority } from '../../types';

interface EditEntryDialogProps {
  entry: CashflowEntry;
  mode?: 'edit' | 'add';
  onClose: () => void;
}

export default function EditEntryDialog({ entry, onClose, mode = 'edit' }: EditEntryDialogProps) {
  const updateEntry = useCashflowStore(state => state.updateEntry);
  const addEntry = useCashflowStore(state => state.addEntry);

  const [type, setType] = useState<CashflowType>(entry.type);
  const [direction, setDirection] = useState<FlowDirection>(entry.direction);
  const [amount, setAmount] = useState(entry.amount);
  const [date, setDate] = useState(entry.date);
  const [description, setDescription] = useState(entry.description);
  const [priority, setPriority] = useState<Priority>(entry.priority);
  const [source, setSource] = useState(entry.source);
  const [isDelayed, setIsDelayed] = useState(entry.isDelayed);
  const [delayNote, setDelayNote] = useState(entry.delayNote || '');
  const [originalDate, setOriginalDate] = useState(entry.originalDate || '');
  const [reason, setReason] = useState('');

  useEffect(() => {
    setType(entry.type);
    setDirection(entry.direction);
    setAmount(entry.amount);
    setDate(entry.date);
    setDescription(entry.description);
    setPriority(entry.priority);
    setSource(entry.source);
    setIsDelayed(entry.isDelayed);
    setDelayNote(entry.delayNote || '');
    setOriginalDate(entry.originalDate || '');
  }, [entry]);

  const handleSave = () => {
    if (mode === 'add') {
      if (amount <= 0 || !description.trim()) return;
      addEntry({
        type,
        direction,
        amount,
        date,
        description,
        priority,
        source,
        isDelayed,
        delayNote: delayNote || undefined,
        originalDate: originalDate || undefined
      });
      onClose();
      return;
    }

    const changes: Partial<CashflowEntry> = {};

    if (type !== entry.type) changes.type = type;
    if (direction !== entry.direction) changes.direction = direction;
    if (amount !== entry.amount) changes.amount = amount;
    if (date !== entry.date) changes.date = date;
    if (description !== entry.description) changes.description = description;
    if (priority !== entry.priority) changes.priority = priority;
    if (source !== entry.source) changes.source = source;

    if (isDelayed !== entry.isDelayed) {
      changes.isDelayed = isDelayed;
      if (isDelayed) {
        changes.delayNote = delayNote;
        changes.originalDate = originalDate || entry.date;
      }
    }

    if (Object.keys(changes).length > 0) {
      updateEntry(entry.id, changes, reason || '手动修正');
    }
    onClose();
  };

  const typeOptions: CashflowType[] = ['salary', 'rent', 'loan', 'receivable', 'tax', 'other'];
  const priorityOptions: Priority[] = ['high', 'medium', 'low'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{mode === 'add' ? '新增条目' : '编辑条目'}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select
                value={type}
                onChange={e => {
                  const newType = e.target.value as CashflowType;
                  setType(newType);
                  if (newType === 'receivable') {
                    setDirection('in');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              >
                {typeOptions.map(opt => (
                  <option key={opt} value={opt}>{CASHFLOW_TYPE_LABELS[opt]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">方向</label>
              <select
                value={direction}
                onChange={e => setDirection(e.target.value as FlowDirection)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              >
                <option value="in">流入</option>
                <option value="out">流出</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              placeholder="描述..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              >
                {priorityOptions.map(opt => (
                  <option key={opt} value={opt}>{PRIORITY_LABELS[opt]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                placeholder="来源..."
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDelayed}
                onChange={e => setIsDelayed(e.target.checked)}
                className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <AlertTriangle size={14} className="text-yellow-500" />
                标记为延期
              </span>
            </label>

            {isDelayed && (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">原定日期</label>
                  <input
                    type="date"
                    value={originalDate}
                    onChange={e => setOriginalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">延期备注</label>
                  <input
                    type="text"
                    value={delayNote}
                    onChange={e => setDelayNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    placeholder="延期原因..."
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">修正原因 (可选)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              placeholder="例如：客户确认延期、金额调整等"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}