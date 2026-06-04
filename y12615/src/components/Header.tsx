import { useApp } from '../context/AppContext';
import { exportToExcel, parseScoreRecords } from '../utils';
import { useState } from 'react';

export default function Header() {
  const { scoreRecords, anomalies, activeColorRule, setScoreRecords, setAnomalies } = useApp();
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    const approvedCount = scoreRecords.filter(r => r.status === 'approved').length;
    const pendingCount = scoreRecords.filter(r => r.status === 'pending').length;
    const rejectedCount = scoreRecords.filter(r => r.status === 'rejected').length;
    const anomalyCount = anomalies.filter(a => a.status !== 'resolved').length;

    exportToExcel({
      summary: {
        totalRecords: scoreRecords.length,
        approvedCount,
        pendingCount,
        rejectedCount,
        anomalyCount,
      },
      records: scoreRecords,
      anomalies,
      exportedAt: new Date().toISOString(),
      colorRuleVersion: activeColorRule?.version || 'unknown',
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const records = await parseScoreRecords(file);
      setScoreRecords(records);
      setAnomalies([]);
      alert(`成功导入 ${records.length} 条记录`);
    } catch (error) {
      alert('导入失败：' + (error as Error).message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">化学装置流程卡片</h1>
        {activeColorRule && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            颜色规则: {activeColorRule.name} ({activeColorRule.version})
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
          importing ? 'bg-gray-300 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
            className="hidden"
            disabled={importing}
          />
          {importing ? '导入中...' : '导入评分表'}
        </label>

        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          导出结果
        </button>
      </div>
    </header>
  );
}
