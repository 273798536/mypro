import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, User, Flag } from 'lucide-react';
import { motion } from 'framer-motion';

const ImportPage = () => {
  const { pendingItems, markAsReviewed, setForfeitScore, loadMockData, athletes, events } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setImportStatus('success');
    loadMockData();
    setTimeout(() => setImportStatus('idle'), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportStatus('success');
      loadMockData();
      setTimeout(() => setImportStatus('idle'), 3000);
    }
  };

  const forfeitItems = pendingItems.filter((p) => p.type === 'forfeit');
  const appealItems = pendingItems.filter((p) => p.type === 'appeal');
  const unreviewedForfeits = forfeitItems.filter((p) => !p.reviewed);
  const unreviewedAppeals = appealItems.filter((p) => !p.reviewed);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white">数据导入</h2>
        <p className="text-dark-400 text-sm mt-1">上传成绩数据包，系统将自动识别待确认项</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7">
          <div
            className={`card p-8 border-2 border-dashed transition-all duration-200 ${
              isDragging
                ? 'border-primary-500 bg-primary-500/10'
                : importStatus === 'success'
                ? 'border-success bg-success/10'
                : importStatus === 'error'
                ? 'border-danger bg-danger/10'
                : 'border-dark-600 hover:border-dark-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              {importStatus === 'success' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center"
                >
                  <CheckCircle className="w-8 h-8 text-success" />
                </motion.div>
              ) : importStatus === 'error' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center"
                >
                  <XCircle className="w-8 h-8 text-danger" />
                </motion.div>
              ) : (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-dark-400" />
                </div>
              )}

              <h3 className="text-lg font-semibold text-white mb-2">
                {importStatus === 'success'
                  ? '导入成功！'
                  : importStatus === 'error'
                  ? '导入失败'
                  : '拖拽文件到此处'}
              </h3>
              <p className="text-dark-400 text-sm mb-4">
                支持 Excel、CSV 格式，包含选手成绩、同分规则和申诉备注
              </p>

              <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-lg cursor-pointer hover:from-primary-600 hover:to-accent-600 transition-all">
                <FileSpreadsheet className="w-5 h-5" />
                选择文件
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv,.json"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          <div className="card p-5 mt-6">
            <h3 className="font-display font-semibold text-white mb-4">数据预览</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <p className="text-3xl font-display font-bold text-primary-400">
                  {athletes.length}
                </p>
                <p className="text-sm text-dark-400">参赛选手</p>
              </div>
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <p className="text-3xl font-display font-bold text-success">
                  {events.length}
                </p>
                <p className="text-sm text-dark-400">比赛项目</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-5 space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-warning" />
                <h3 className="font-display font-semibold text-white">弃权待确认</h3>
              </div>
              {unreviewedForfeits.length > 0 && (
                <span className="px-2 py-1 bg-warning/20 text-warning rounded-full text-xs">
                  {unreviewedForfeits.length} 项
                </span>
              )}
            </div>

            {forfeitItems.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {forfeitItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all ${
                      item.reviewed
                        ? 'bg-dark-700/30 border-dark-600/30'
                        : 'bg-warning/10 border-warning/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-dark-400" />
                        <div>
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="text-xs text-dark-400">{item.description}</p>
                        </div>
                      </div>
                      {item.reviewed ? (
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setForfeitScore(item.scoreId!, 0)}
                            className="px-2 py-1 text-xs bg-dark-600 text-white rounded hover:bg-dark-500"
                          >
                            记0分
                          </button>
                          <button
                            onClick={() => markAsReviewed(item.id)}
                            className="px-2 py-1 text-xs bg-success/20 text-success rounded hover:bg-success/30"
                          >
                            确认
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-dark-400 text-sm">暂无弃权待确认</p>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <h3 className="font-display font-semibold text-white">申诉待处理</h3>
              </div>
              {unreviewedAppeals.length > 0 && (
                <span className="px-2 py-1 bg-danger/20 text-danger rounded-full text-xs">
                  {unreviewedAppeals.length} 项
                </span>
              )}
            </div>

            {appealItems.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {appealItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all ${
                      item.reviewed
                        ? 'bg-dark-700/30 border-dark-600/30'
                        : 'bg-danger/10 border-danger/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-dark-400">{item.description}</p>
                      </div>
                      {item.reviewed ? (
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      ) : (
                        <span className="text-xs text-danger animate-pulse">待处理</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-dark-400 text-sm">暂无申诉待处理</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
