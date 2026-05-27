import React, { useState } from 'react';
import { Bike, ArrowLeft, Trash2, Download, Clock, User, Edit3, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRideStore } from '@/store/useRideStore';
import { getPowerZoneInfo } from '@/utils/powerCalculator';
import { HistoryRecord } from '@/types';

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSource = (source: string) => {
  const sourceMap: Record<string, string> = {
    manual: '手动输入',
    import: '批量导入',
    sample: '样例数据',
  };
  return sourceMap[source] || source;
};

const History: React.FC = () => {
  const navigate = useNavigate();
  const { history, deleteHistoryRecord, loadFromHistory, ftp } = useRideStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleLoad = (record: HistoryRecord) => {
    loadFromHistory(record.id);
    navigate('/');
  };

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-dark-900">
        <header className="bg-dark-800 border-b border-dark-700">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-xl">
                  <FileText className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">历史记录</h1>
                  <p className="text-sm text-dark-400">训练数据与版本追溯</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-16">
          <div className="text-center">
            <Bike className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-300 mb-2">暂无历史记录</h2>
            <p className="text-dark-500 mb-6">在计算器页面保存训练数据后，记录将显示在这里</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              开始计算
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <header className="bg-dark-800 border-b border-dark-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-xl">
                  <FileText className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">历史记录</h1>
                  <p className="text-sm text-dark-400">共 {history.length} 条记录</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-4">
          {history.map((record) => (
            <HistoryCard
              key={record.id}
              record={record}
              ftp={ftp}
              isExpanded={expandedId === record.id}
              onToggle={() => setExpandedId(expandedId === record.id ? null : record.id)}
              onLoad={() => handleLoad(record)}
              onDelete={() => deleteHistoryRecord(record.id)}
              onExport={() => navigate(`/report/${record.id}`)}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

interface HistoryCardProps {
  record: HistoryRecord;
  ftp: number;
  isExpanded: boolean;
  onToggle: () => void;
  onLoad: () => void;
  onDelete: () => void;
  onExport: () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({
  record,
  ftp,
  isExpanded,
  onToggle,
  onLoad,
  onDelete,
  onExport,
}) => {
  const zoneInfo = getPowerZoneInfo(record.result.power, ftp);

  return (
    <div className="card overflow-hidden">
      <div className="card-body" onClick={onToggle}>
        <div className="flex items-start justify-between cursor-pointer">
          <div className="flex items-start gap-4 flex-1">
            <div
              className="p-3 rounded-xl flex-shrink-0"
              style={{ backgroundColor: `${zoneInfo.color}20` }}
            >
              <span
                className="font-mono font-bold text-2xl"
                style={{ color: zoneInfo.color }}
              >
                {record.result.power}
              </span>
              <p className="text-xs text-dark-500 mt-1">W</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg truncate">
                  {record.input.segmentName || '未命名路段'}
                </h3>
                <span
                  className="badge text-xs"
                  style={{ backgroundColor: `${zoneInfo.color}20`, color: zoneInfo.color }}
                >
                  Z{record.result.powerZone} {zoneInfo.name}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-dark-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(record.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {formatSource(record.input.source)}
                </span>
                {record.versions.length > 1 && (
                  <span className="badge-warning">
                    <Edit3 className="w-3 h-3 mr-1" />
                    已修正 {record.versions.length - 1} 次
                  </span>
                )}
                {!record.validation.isValid && (
                  <span className="badge-error">存在异常</span>
                )}
              </div>
              <div className="flex items-center gap-6 mt-3 text-sm">
                <div>
                  <span className="text-dark-500">速度</span>
                  <span className="font-mono ml-2">{record.result.speed} km/h</span>
                </div>
                <div>
                  <span className="text-dark-500">齿比</span>
                  <span className="font-mono ml-2">{record.result.gearRatio}</span>
                </div>
                <div>
                  <span className="text-dark-500">功体比</span>
                  <span className="font-mono ml-2">{record.result.powerPerKg} W/kg</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-dark-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-dark-500" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="border-t border-dark-700 px-6 py-4">
            <h4 className="font-medium text-dark-300 mb-3">版本历史</h4>
            <div className="space-y-3">
              {record.versions.slice().reverse().map((version) => (
                <div
                  key={version.version}
                  className="p-3 bg-dark-900/50 rounded-lg border border-dark-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge-primary">v{version.version}</span>
                    <span className="text-xs text-dark-500">
                      {formatDate(version.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-dark-400 mb-2">{version.note}</p>
                  {Object.keys(version.changes).length > 0 && (
                    <div className="space-y-1 text-xs">
                      {Object.entries(version.changes).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-dark-500">{key}:</span>
                          <span className="text-error-400 line-through">
                            {String(version.previousValues[key as keyof typeof version.previousValues])}
                          </span>
                          <span className="text-dark-400">→</span>
                          <span className="text-success-400">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-dark-700 px-6 py-4 flex gap-3">
            <button onClick={onLoad} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Bike className="w-4 h-4" />
              加载到计算器
            </button>
            <button onClick={onExport} className="btn-secondary flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              导出报告
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定要删除这条记录吗？')) {
                  onDelete();
                }
              }}
              className="btn-danger flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default History;
