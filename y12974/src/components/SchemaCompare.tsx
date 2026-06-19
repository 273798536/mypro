import { useEffect } from 'react';
import { GitCompare, Plus, Minus, Edit3, ChevronRight, Database, Columns, Key, Info } from 'lucide-react';
import type { SchemaCompareResult, TableDiff, ColumnDiff, IndexDiff } from '../types';
import { useDashboardStore } from '../store/useDashboardStore';
import { schemaVersions } from '../data/schemaVersions';

interface SchemaCompareProps {
  result: SchemaCompareResult | null;
}

const changeTypeConfig = {
  added: { icon: Plus, color: 'text-green-600 bg-green-50', label: '新增' },
  removed: { icon: Minus, color: 'text-red-600 bg-red-50', label: '删除' },
  modified: { icon: Edit3, color: 'text-amber-600 bg-amber-50', label: '修改' }
};

export default function SchemaCompare({ result }: SchemaCompareProps) {
  const {
    selectedSchemaVersions,
    setSelectedSchemaVersions,
    compareSchemas
  } = useDashboardStore();

  useEffect(() => {
    if (!result) {
      compareSchemas();
    }
  }, []);

  const renderColumnDiff = (diff: ColumnDiff) => {
    const config = changeTypeConfig[diff.changeType];
    const Icon = config.icon;

    return (
      <div key={diff.columnName} className="flex items-start gap-2 py-2 border-l-2 pl-3 border-gray-100">
        <div className={`p-0.5 rounded ${config.color} flex-shrink-0 mt-0.5`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium text-gray-900">{diff.columnName}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>{config.label}</span>
          </div>
          {diff.oldColumn && (
            <div className="text-xs text-gray-500 mt-1 line-through">
              旧: {diff.oldColumn.type} {diff.oldColumn.nullable ? 'NULL' : 'NOT NULL'}
              {diff.oldColumn.default ? ` DEFAULT ${diff.oldColumn.default}` : ''}
            </div>
          )}
          {diff.newColumn && (
            <div className="text-xs text-gray-700 mt-1">
              新: {diff.newColumn.type} {diff.newColumn.nullable ? 'NULL' : 'NOT NULL'}
              {diff.newColumn.default ? ` DEFAULT ${diff.newColumn.default}` : ''}
            </div>
          )}
          {diff.differences && diff.differences.length > 0 && (
            <div className="text-xs text-amber-600 mt-1">
              变更: {diff.differences.join(' | ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderIndexDiff = (diff: IndexDiff) => {
    const config = changeTypeConfig[diff.changeType];
    const Icon = config.icon;

    return (
      <div key={diff.indexName} className="flex items-start gap-2 py-2 border-l-2 pl-3 border-gray-100">
        <div className={`p-0.5 rounded ${config.color} flex-shrink-0 mt-0.5`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Key className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-mono text-sm font-medium text-gray-900">{diff.indexName}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${config.color}`}>{config.label}</span>
          </div>
          {diff.oldIndex && (
            <div className="text-xs text-gray-500 mt-1 line-through">
              旧: [{diff.oldIndex.columns.join(', ')}] ({diff.oldIndex.type})
            </div>
          )}
          {diff.newIndex && (
            <div className="text-xs text-gray-700 mt-1">
              新: [{diff.newIndex.columns.join(', ')}] ({diff.newIndex.type})
            </div>
          )}
          {diff.differences && diff.differences.length > 0 && (
            <div className="text-xs text-amber-600 mt-1">
              变更: {diff.differences.join(' | ')}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTableDiff = (tableDiff: TableDiff) => {
    const config = changeTypeConfig[tableDiff.changeType];
    const Icon = config.icon;
    const hasChanges = tableDiff.columnDiffs.length > 0 || tableDiff.indexDiffs.length > 0 ||
      (tableDiff.tableDifferences && tableDiff.tableDifferences.length > 0);

    return (
      <div key={tableDiff.tableName} className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-semibold text-gray-900">{tableDiff.tableName}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
            </div>
            {tableDiff.tableDifferences && tableDiff.tableDifferences.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {tableDiff.tableDifferences.join(' | ')}
              </p>
            )}
          </div>
          <div className="text-right text-sm">
            {tableDiff.columnDiffs.length > 0 && (
              <div className="text-gray-600">
                <Columns className="w-3.5 h-3.5 inline mr-1" />
                {tableDiff.columnDiffs.length} 个字段变更
              </div>
            )}
            {tableDiff.indexDiffs.length > 0 && (
              <div className="text-gray-600 mt-1">
                <Key className="w-3.5 h-3.5 inline mr-1" />
                {tableDiff.indexDiffs.length} 个索引变更
              </div>
            )}
          </div>
        </div>

        {hasChanges && (
          <div className="p-4 border-t border-gray-100 bg-white space-y-4">
            {tableDiff.columnDiffs.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5" />
                  字段变更
                </h5>
                <div className="space-y-1">
                  {tableDiff.columnDiffs.map(renderColumnDiff)}
                </div>
              </div>
            )}
            {tableDiff.indexDiffs.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  索引变更
                </h5>
                <div className="space-y-1">
                  {tableDiff.indexDiffs.map(renderIndexDiff)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!result) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <GitCompare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">点击"对比 Schema"按钮查看版本差异</p>
      </div>
    );
  }

  const s = result.summary;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-500" />
            Schema 版本对比
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            支持任意两个版本之间的对比，而非一次性判断。迁移脚本补录后可重新选择版本对比。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSchemaVersions.oldVersion}
            onChange={(e) => setSelectedSchemaVersions(e.target.value, selectedSchemaVersions.newVersion)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {schemaVersions.map(v => (
              <option key={v.version} value={v.version}>{v.version}</option>
            ))}
          </select>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <select
            value={selectedSchemaVersions.newVersion}
            onChange={(e) => setSelectedSchemaVersions(selectedSchemaVersions.oldVersion, e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {schemaVersions.map(v => (
              <option key={v.version} value={v.version}>{v.version}</option>
            ))}
          </select>
          <button
            onClick={compareSchemas}
            className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            对比
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {[
          { label: '新增表', value: s.tablesAdded, type: 'added' },
          { label: '修改表', value: s.tablesModified, type: 'modified' },
          { label: '删除表', value: s.tablesRemoved, type: 'removed' },
          { label: '新增字段', value: s.columnsAdded, type: 'added' },
          { label: '修改字段', value: s.columnsModified, type: 'modified' },
          { label: '删除字段', value: s.columnsRemoved, type: 'removed' },
          { label: '新增索引', value: s.indexesAdded, type: 'added' },
          { label: '修改索引', value: s.indexesModified, type: 'modified' },
          { label: '删除索引', value: s.indexesRemoved, type: 'removed' }
        ].map((item, idx) => {
          const config = changeTypeConfig[item.type as keyof typeof changeTypeConfig];
          return (
            <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className={`text-2xl font-bold ${config.color.split(' ')[0]}`}>
                {item.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.label}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {result.tableDiffs.map(renderTableDiff)}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          对比说明
        </h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• <span className="font-medium">非一次性判断</span>：可选择任意两个版本进行对比，不受当前版本限制</li>
          <li>• <span className="font-medium">迁移脚本联动</span>：补录迁移脚本后，选择对应版本即可看到变更</li>
          <li>• <span className="font-medium">备份校验同步</span>：Schema 变更后，备份校验会自动更新检查项</li>
          <li>• <span className="text-green-600 font-medium">绿色</span> 表示新增，
              <span className="text-red-600 font-medium"> 红色</span> 表示删除，
              <span className="text-amber-600 font-medium"> 橙色</span> 表示修改</li>
        </ul>
      </div>
    </div>
  );
}
