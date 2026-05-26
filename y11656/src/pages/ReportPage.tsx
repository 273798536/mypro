import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatsChart } from '@/components/report/StatsChart';
import { ExportPanel } from '@/components/report/ExportPanel';
import { Button } from '@/components/common/Button';
import { useGameStore } from '@/store/useGameStore';
import type { GameRecord } from '@/types';
import { TARGET_AREA_LABELS } from '@/types';
import { ArrowLeft } from 'lucide-react';

export function ReportPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { gameRecords } = useGameStore();
  const [record, setRecord] = useState<GameRecord | null>(null);

  useEffect(() => {
    if (!gameId) return;
    
    const found = gameRecords.find(r => r.id === gameId);
    if (found) {
      setRecord(found);
    } else {
      navigate('/');
    }
  }, [gameId, gameRecords, navigate]);

  if (!record) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-700 text-xl">加载中...</div>
      </div>
    );
  }

  const handleBack = () => {
    navigate(`/result/${record.id}`);
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-amber-200 py-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={handleBack} variant="secondary" size="sm" className="flex items-center gap-2">
            <ArrowLeft size={18} />
            返回结果
          </Button>
          <h1 className="text-2xl font-bold text-amber-900">详细报告</h1>
          <Button onClick={handleHome} variant="secondary" size="sm">
            首页
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-amber-900 mb-4">操作时间线</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-100">
                  <th className="text-left p-3 text-amber-800">序号</th>
                  <th className="text-left p-3 text-amber-800">书名</th>
                  <th className="text-left p-3 text-amber-800">操作区域</th>
                  <th className="text-left p-3 text-amber-800">正确区域</th>
                  <th className="text-left p-3 text-amber-800">结果</th>
                  <th className="text-left p-3 text-amber-800">得分</th>
                </tr>
              </thead>
              <tbody>
                {record.actions.map((action, index) => (
                  <tr
                    key={index}
                    className={action.isCorrect ? 'bg-green-50' : 'bg-red-50'}
                  >
                    <td className="p-3 text-amber-800">{index + 1}</td>
                    <td className="p-3 text-amber-900 font-medium">{action.itemTitle}</td>
                    <td className="p-3 text-amber-700">{TARGET_AREA_LABELS[action.target]}</td>
                    <td className="p-3 text-amber-700">{TARGET_AREA_LABELS[action.correctTarget]}</td>
                    <td className={`p-3 font-medium ${action.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {action.isCorrect ? '正确' : '错误'}
                    </td>
                    <td className={`p-3 font-bold ${action.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {action.points > 0 ? `+${action.points}` : action.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <StatsChart actions={record.actions} />
        <div className="mt-6">
          <ExportPanel record={record} />
        </div>
      </div>
    </div>
  );
}
