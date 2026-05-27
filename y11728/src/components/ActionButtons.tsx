import React, { useState } from 'react';
import { Save, RotateCcw, Download, FileText } from 'lucide-react';
import { useRideStore } from '@/store/useRideStore';
import { useNavigate } from 'react-router-dom';

const ActionButtons: React.FC = () => {
  const { currentResult, currentValidation, saveToHistory, clearCurrent, history, selectedHistoryId } = useRideStore();
  const navigate = useNavigate();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    if (!currentResult) return;
    try {
      const id = saveToHistory();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const canSave = currentResult && currentValidation?.isValid;
  const canExport = currentResult;

  return (
    <div className="card">
      <div className="card-body flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`flex-1 min-w-[140px] btn-primary flex items-center justify-center gap-2 ${
            !canSave ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Save className="w-4 h-4" />
          {saveSuccess ? '已保存!' : '保存到历史'}
        </button>
        <button
          onClick={clearCurrent}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          重置
        </button>
        <button
          onClick={() => navigate('/history')}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          历史记录 ({history.length})
        </button>
        {canExport && selectedHistoryId && (
          <button
            onClick={() => navigate(`/report/${selectedHistoryId}`)}
            className="btn-success flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出报告
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionButtons;
