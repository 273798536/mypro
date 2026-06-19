import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  FileCode,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import type { BackupVerifyResult, VerifyItem, VerifyCategory } from '../types';
import { useDashboardStore } from '../store/useDashboardStore';
import { backupVerifyResults } from '../data/backupVerify';

interface BackupVerifyPanelProps {
  result: BackupVerifyResult;
}

const statusConfig = {
  passed: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: '通过' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', label: '警告' },
  failed: { icon: XCircle, color: 'text-red-600 bg-red-50', label: '未通过' }
};

const categoryConfig: Record<VerifyCategory, { label: string; icon: typeof Database }> = {
  table_structure: { label: '表结构', icon: Database },
  index: { label: '索引', icon: Database },
  data_integrity: { label: '数据完整性', icon: ShieldCheck },
  constraint: { label: '约束', icon: FileCode }
};

export default function BackupVerifyPanel({ result }: BackupVerifyPanelProps) {
  const { selectBackupVerify } = useDashboardStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(result.items.filter(i => i.status !== 'passed').map(i => i.id))
  );

  const toggleExpand = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedItems(next);
  };

  const overallConfig = statusConfig[result.status];
  const OverallIcon = overallConfig.icon;

  const stats = {
    passed: result.items.filter(i => i.status === 'passed').length,
    warning: result.items.filter(i => i.status === 'warning').length,
    failed: result.items.filter(i => i.status === 'failed').length
  };

  const renderVerifyItem = (item: VerifyItem) => {
    const config = statusConfig[item.status];
    const ItemIcon = config.icon;
    const catConfig = categoryConfig[item.category];
    const CatIcon = catConfig.icon;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div
        key={item.id}
        className={`border rounded-lg overflow-hidden ${
          item.status === 'failed' ? 'border-red-200' :
          item.status === 'warning' ? 'border-amber-200' :
          'border-gray-200'
        }`}
      >
        <div
          className={`flex items-start justify-between p-3 cursor-pointer ${
            item.status === 'failed' ? 'bg-red-50/50' :
            item.status === 'warning' ? 'bg-amber-50/50' :
            'bg-white'
          }`}
          onClick={() => toggleExpand(item.id)}
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-1.5 rounded ${config.color} flex-shrink-0 mt-0.5`}>
              <ItemIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs font-mono text-gray-500">{item.id}</code>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <CatIcon className="w-3 h-3" />
                  {catConfig.label}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>{config.label}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{item.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
          </div>
          <div className="ml-3">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 border-t border-gray-100 bg-white space-y-3">
            {item.detail && (
              <div className="text-sm">
                <span className="text-gray-500">校验详情：</span>
                <span className="text-gray-700">{item.detail}</span>
              </div>
            )}
            {item.businessImpact && (
              <div className="text-sm p-3 bg-red-50 rounded-lg">
                <span className="text-red-700 font-medium">业务影响：</span>
                <span className="text-red-600">{item.businessImpact}</span>
              </div>
            )}
            {item.relatedMigration && (
              <div className="text-sm flex items-start gap-2">
                <FileCode className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-gray-500">相关迁移脚本：</span>
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{item.relatedMigration}</code>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            备份校验结果
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Schema 版本变更后，备份校验自动更新检查项，确保迁移后数据完整性
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">选择版本:</span>
          <select
            value={result.schemaVersion}
            onChange={(e) => selectBackupVerify(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {backupVerifyResults.map(r => (
              <option key={r.schemaVersion} value={r.schemaVersion}>
                {r.schemaVersion} ({r.timestamp})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-5">
        <div className={`p-3 rounded-full ${overallConfig.color}`}>
          <OverallIcon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">整体校验</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${overallConfig.color}`}>
              {overallConfig.label}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Schema 版本: {result.schemaVersion} · 校验时间: {result.timestamp}
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{stats.passed}</div>
            <div className="text-xs text-gray-500">通过</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-600">{stats.warning}</div>
            <div className="text-xs text-gray-500">警告</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-gray-500">未通过</div>
          </div>
        </div>
      </div>

      {stats.failed > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-500" />
            未通过项 ({stats.failed})
          </h4>
          <div className="space-y-2">
            {result.items.filter(i => i.status === 'failed').map(renderVerifyItem)}
          </div>
        </div>
      )}

      {stats.warning > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            警告项 ({stats.warning})
          </h4>
          <div className="space-y-2">
            {result.items.filter(i => i.status === 'warning').map(renderVerifyItem)}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-green-500" />
          通过项 ({stats.passed})
        </h4>
        <div className="space-y-2">
          {result.items.filter(i => i.status === 'passed').map(renderVerifyItem)}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          校验说明
        </h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <span className="font-medium">自动联动更新</span>：Schema 版本变更或迁移脚本补录后，校验项会自动更新</li>
          <li>• <span className="font-medium">分类校验</span>：包含表结构、索引、数据完整性、约束四大类检查</li>
          <li>• <span className="font-medium">可追溯</span>：每项校验都关联对应的迁移脚本，便于问题定位</li>
          <li>• <span className="font-medium">业务视角</span>：每项异常都标注业务影响，便于业务同事理解风险</li>
        </ul>
      </div>
    </div>
  );
}
