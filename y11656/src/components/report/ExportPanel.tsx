import { downloadCSV, downloadJSON } from '@/utils/export';
import type { GameRecord } from '@/types';
import { FileDown, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '../common/Button';

interface ExportPanelProps {
  record: GameRecord;
}

export function ExportPanel({ record }: ExportPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-amber-900 mb-4">导出报告</h2>
      <p className="text-amber-600 mb-4">导出本次游戏的详细操作记录和统计数据</p>
      
      <div className="flex gap-4">
        <Button onClick={() => downloadCSV(record)} variant="secondary" className="flex items-center gap-2">
          <FileSpreadsheet size={18} />
          导出 CSV
        </Button>
        <Button onClick={() => downloadJSON(record)} variant="secondary" className="flex items-center gap-2">
          <FileJson size={18} />
          导出 JSON
        </Button>
      </div>
      
      <div className="mt-6 p-4 bg-amber-50 rounded-lg">
        <h3 className="font-semibold text-amber-800 mb-2">报告内容</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• 关卡名称：{record.levelName}</li>
          <li>• 总分：{record.score} 分</li>
          <li>• 正确率：{((record.correctCount / record.totalItems) * 100).toFixed(1)}%</li>
          <li>• 用时：{record.duration} 秒</li>
          <li>• 详细操作记录：{record.actions.length} 条</li>
        </ul>
      </div>
    </div>
  );
}
