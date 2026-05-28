import { useState } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';

interface AdFeeFormProps {
  periodId: string;
  periodName: string;
  onClose: () => void;
  onSubmit: (records: Array<{ campaignName: string; amount: number }>) => void;
}

export function AdFeeModal({ periodId, periodName, onClose, onSubmit }: AdFeeFormProps) {
  const [records, setRecords] = useState([{ campaignName: '', amount: '' }]);

  const addRecord = () => {
    setRecords([...records, { campaignName: '', amount: '' }]);
  };

  const removeRecord = (index: number) => {
    if (records.length > 1) {
      setRecords(records.filter((_, i) => i !== index));
    }
  };

  const updateRecord = (index: number, field: 'campaignName' | 'amount', value: string) => {
    const newRecords = [...records];
    newRecords[index][field] = value;
    setRecords(newRecords);
  };

  const handleSubmit = () => {
    const validRecords = records.filter((r) => r.campaignName && r.amount);
    if (validRecords.length > 0) {
      onSubmit(
        validRecords.map((r) => ({
          campaignName: r.campaignName,
          amount: parseFloat(r.amount) || 0,
        }))
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="font-bold text-lg text-gray-800">补录广告扣费</h3>
            <p className="text-sm text-gray-500">账期: {periodName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {records.map((record, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="广告活动名称"
                    value={record.campaignName}
                    onChange={(e) => updateRecord(index, 'campaignName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    placeholder="金额"
                    value={record.amount}
                    onChange={(e) => updateRecord(index, 'amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => removeRecord(index)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={records.length === 1}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addRecord}
            className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-500 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={16} />
            添加一条记录
          </button>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            提交补录
          </button>
        </div>
      </div>
    </div>
  );
}
