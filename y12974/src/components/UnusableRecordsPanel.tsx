import {
  AlertOctagon,
  Database,
  AlertTriangle,
  XCircle,
  FileText,
  Info,
  Zap
} from 'lucide-react';
import type { ReportData } from '../types';

type UnusableRecord = ReportData['unusableRecords'][number];

interface UnusableRecordsPanelProps {
  records: UnusableRecord[];
}

const sourceConfig = {
  slow_query: { label: '慢查询', color: 'bg-red-100 text-red-700', icon: Zap },
  failed: { label: '校验失败', color: 'bg-red-100 text-red-700', icon: XCircle },
  warning: { label: '校验警告', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle }
};

export default function UnusableRecordsPanel({ records }: UnusableRecordsPanelProps) {
  const groupedByTable = records.reduce((acc, record) => {
    if (!acc[record.tableName]) {
      acc[record.tableName] = [];
    }
    acc[record.tableName].push(record);
    return acc;
  }, {} as Record<string, UnusableRecord[]>);

  const tables = Object.keys(groupedByTable);
  const criticalCount = records.filter(r => r.source === 'slow_query' || r.source === 'failed').length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            不可用记录清单
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            业务同事重点关注：以下表存在可能导致业务不可用的问题，建议优先处理
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="px-3 py-1.5 bg-red-50 rounded-lg">
            <span className="text-red-600 font-semibold">{tables.length}</span>
            <span className="text-gray-500 ml-1">张表受影响</span>
          </div>
          <div className="px-3 py-1.5 bg-red-50 rounded-lg">
            <span className="text-red-600 font-semibold">{criticalCount}</span>
            <span className="text-gray-500 ml-1">项严重问题</span>
          </div>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <AlertOctagon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>暂无不可用记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tables.map((tableName, tableIdx) => {
            const tableRecords = groupedByTable[tableName];
            const hasCritical = tableRecords.some(r => r.source === 'slow_query' || r.source === 'failed');

            return (
              <div
                key={tableName}
                className={`border rounded-lg overflow-hidden ${
                  hasCritical ? 'border-red-200 bg-red-50/30' : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100">
                  <div className={`p-2 rounded-lg ${hasCritical ? 'bg-red-100' : 'bg-amber-100'}`}>
                    <Database className={`w-4 h-4 ${hasCritical ? 'text-red-600' : 'text-amber-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-gray-900">{tableName}</span>
                      {hasCritical ? (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                          高优先级
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          中优先级
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      共 {tableRecords.length} 项问题
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {tableRecords.map((record, recIdx) => {
                    const config = sourceConfig[record.source as keyof typeof sourceConfig] || {
                      label: record.source,
                      color: 'bg-gray-100 text-gray-700',
                      icon: FileText
                    };
                    const SourceIcon = config.icon;

                    return (
                      <div key={recIdx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                        <div className={`p-1.5 rounded ${config.color} flex-shrink-0 mt-0.5`}>
                          <SourceIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{record.reason}</p>
                          <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
                            <p className="text-xs text-red-700">
                              <span className="font-medium">业务影响：</span>
                              {record.impact}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          业务同事使用说明
        </h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <span className="font-medium">月底转交时重点查看此清单</span>，不需要关注系统有多少菜单，只看哪些表不能用</li>
          <li>• <span className="text-red-600 font-medium">高优先级</span>：涉及慢查询索引失效或校验失败，可能直接影响业务运行</li>
          <li>• <span className="text-amber-600 font-medium">中优先级</span>：涉及校验警告，暂时可用但存在数据完整性风险</li>
          <li>• 每项问题都标注了具体的业务影响，无需技术背景即可理解风险等级</li>
          <li>• 导出的报告中也包含此清单，可直接转发给相关业务同事</li>
        </ul>
      </div>
    </div>
  );
}
