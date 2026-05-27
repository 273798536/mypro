import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Trash2, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { getHistoryList, deleteGameFromHistory, clearAllHistory } from '@/utils/storage';
import { GameHistoryMeta } from '@/types/game';
import { cn } from '@/lib/utils';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<GameHistoryMeta[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const data = getHistoryList();
    setHistory(data);
  };

  const handleViewDetail = (id: string) => {
    navigate(`/history/${id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定删除这条记录吗？')) {
      deleteGameFromHistory(id);
      loadHistory();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('确定清空所有历史记录吗？此操作不可恢复。')) {
      clearAllHistory();
      loadHistory();
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-xl font-bold text-slate-900">历史记录</h1>
          </div>
          {history.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              清空记录
            </Button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {history.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 mb-2">暂无游戏记录</p>
              <p className="text-sm text-slate-400">完成一局游戏后，记录将显示在这里</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleViewDetail(item.id)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold',
                        item.status === 'bankrupt' ? 'bg-red-500' : 'bg-emerald-500'
                      )}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {item.status === 'bankrupt' ? '破产' : '完成'}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>得分: {item.finalScore} 分</span>
                        <span>现金: ¥{item.finalCash.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</span>
                        <span>{item.totalRounds} 回合</span>
                      </div>
                      {item.endReason && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {item.endReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetail(item.id);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      查看
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(item.id, e)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="确认清空"
        className="max-w-md"
      >
        <div className="p-6">
          <p className="text-slate-600 mb-6">确定要清空所有历史记录吗？此操作不可恢复。</p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleClearAll}>
              确认清空
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
