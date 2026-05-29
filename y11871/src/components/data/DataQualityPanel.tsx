import { useParkingData } from '../../hooks/useParkingData';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Database, AlertTriangle, CheckCircle, XCircle, FileText, Info } from 'lucide-react';

export function DataQualityPanel() {
  const { dataQuality, currentRecord } = useParkingData();

  if (!dataQuality || !currentRecord) {
    return null;
  }

  const qualityScore = dataQuality.avgQuality * 100;
  const qualityColor = 
    qualityScore >= 90 ? 'text-emerald-400' :
    qualityScore >= 70 ? 'text-amber-400' :
    'text-red-400';

  const currentAnomalies = currentRecord.anomalies || [];

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          <Database size={16} />
          数据质量报告
        </Card.Title>
        <Badge 
          variant={
            qualityScore >= 90 ? 'success' :
            qualityScore >= 70 ? 'warning' : 'danger'
          }
        >
          {Math.round(qualityScore)}% 完整度
        </Badge>
      </Card.Header>
      <Card.Content className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold font-display text-cyan-300">
              {dataQuality.totalRecords}
            </div>
            <div className="text-xs text-slate-500">总记录数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-display text-slate-300">
              {dataQuality.totalAnomalies}
            </div>
            <div className="text-xs text-slate-500">异常总数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-display text-amber-400">
              {dataQuality.nullCount}
            </div>
            <div className="text-xs text-slate-500">空值填充</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-display text-cyan-400">
              {dataQuality.remarkCount}
            </div>
            <div className="text-xs text-slate-500">备注保留</div>
          </div>
        </div>

        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              qualityScore >= 90 ? 'bg-emerald-500' :
              qualityScore >= 70 ? 'bg-amber-500' :
              'bg-red-500'
            }`}
            style={{ width: `${qualityScore}%` }}
          />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-slate-400">正常字段</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-slate-400">空值填充</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle size={14} className="text-red-400" />
            <span className="text-slate-400">异常修正</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-cyan-400" />
            <span className="text-slate-400">备注保留</span>
          </div>
        </div>

        {currentAnomalies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
              <Info size={14} />
              当前时刻数据处理记录
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5">
              {currentAnomalies.map((anomaly, index) => (
                <div 
                  key={index}
                  className={`text-xs px-2 py-1.5 rounded flex items-start gap-2 ${
                    anomaly.type === 'null' ? 'bg-amber-500/10 border border-amber-500/20' :
                    anomaly.type === 'anomaly' ? 'bg-red-500/10 border border-red-500/20' :
                    'bg-cyan-500/10 border border-cyan-500/20'
                  }`}
                >
                  {anomaly.type === 'null' && <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />}
                  {anomaly.type === 'anomaly' && <XCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />}
                  {anomaly.type === 'remark' && <FileText size={12} className="text-cyan-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono ${
                        anomaly.type === 'null' ? 'text-amber-400' :
                        anomaly.type === 'anomaly' ? 'text-red-400' :
                        'text-cyan-400'
                      }`}>
                        {anomaly.fieldName}
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className="text-emerald-400">
                        {anomaly.handledValue ?? '忽略'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      {anomaly.type === 'null' && `空值已填充默认值`}
                      {anomaly.type === 'anomaly' && `异常值已修正`}
                      {anomaly.type === 'remark' && `原始备注已保留`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <Info size={12} />
          <span>系统自动处理脏数据，空值使用插值或默认值填充，异常值自动修正，原始备注完整保留。单条数据异常不影响整批加载。</span>
        </div>
      </Card.Content>
    </Card>
  );
}
