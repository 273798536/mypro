import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Eye, Download, Calendar, Award, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useGameStore } from '@/store/gameStore';
import { deleteRecord } from '@/utils/storage';
import { downloadPDF } from '@/utils/pdfExport';
import { formatTime, getGradeColor } from '@/utils/gameEngine';
import { GameRecord } from '@/types/game';

export const HistoryPage = () => {
  const navigate = useNavigate();
  const { records, loadSavedRecords, markAsExported } = useGameStore();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<GameRecord | null>(null);

  useEffect(() => {
    loadSavedRecords();
  }, [loadSavedRecords]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      deleteRecord(id);
      loadSavedRecords();
    }
  };

  const handleExport = async (record: GameRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingId(record.id);
    try {
      await downloadPDF(record);
      markAsExported(record.id);
      loadSavedRecords();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingId(null);
    }
  };

  const handleViewReport = (record: GameRecord) => {
    navigate(`/report/${record.id}`);
  };

  const avgScore = records.length > 0
    ? (records.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / records.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回大厅</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            历史记录
          </h1>
          <div className="w-24" />
        </div>

        {records.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
          >
            <Card className="bg-white/10 backdrop-blur-sm border-0 text-white">
              <CardContent className="p-6 text-center">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-blue-400" />
                <p className="text-3xl font-bold mb-1">{records.length}</p>
                <p className="text-slate-400 text-sm">总完成案件</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-0 text-white">
              <CardContent className="p-6 text-center">
                <Award className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                <p className="text-3xl font-bold mb-1">{avgScore}%</p>
                <p className="text-slate-400 text-sm">平均正确率</p>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm border-0 text-white">
              <CardContent className="p-6 text-center">
                <Clock className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                <p className="text-3xl font-bold mb-1">
                  {formatTime(Math.round(records.reduce((sum, r) => sum + r.totalTime, 0) / records.length || 0))}
                </p>
                <p className="text-slate-400 text-sm">平均用时</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {records.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FileText className="w-20 h-20 mx-auto mb-4 text-slate-600" />
            <h2 className="text-2xl font-bold text-white mb-2">暂无历史记录</h2>
            <p className="text-slate-400 mb-6">完成游戏后，记录将显示在这里</p>
            <Button onClick={() => navigate('/')}>
              开始游戏
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {records.map((record, index) => {
              const percentage = ((record.score / record.maxScore) * 100).toFixed(1);
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    hoverable
                    className="cursor-pointer"
                    onClick={() => handleViewReport(record)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-md"
                            style={{
                              backgroundColor: getGradeColor(record.grade) + '20',
                              color: getGradeColor(record.grade),
                              border: `2px solid ${getGradeColor(record.grade)}`
                            }}
                          >
                            {record.grade}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-lg">{record.caseTitle}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(record.endTime).toLocaleString('zh-CN')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {formatTime(record.totalTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                {record.score}/{record.maxScore} ({percentage}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {record.exported && (
                            <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                              已导出
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => handleExport(record, e)}
                            disabled={exportingId === record.id}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            {exportingId === record.id ? '导出中' : '导出'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReport(record);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={(e) => handleDelete(record.id, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {record.mistakes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <span className="font-medium">错误：</span>
                            <span>{record.mistakes.length}处</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-500">
                              {record.mistakes.slice(0, 2).map(m => m.materialTitle).join('、')}
                              {record.mistakes.length > 2 && '...'}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>💡 点击记录可查看详细报告和错误分析</p>
          <p className="mt-1">所有记录保存在本地浏览器中，清除缓存会丢失数据</p>
        </div>
      </div>
    </div>
  );
};
