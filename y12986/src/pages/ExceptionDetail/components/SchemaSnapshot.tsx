import React, { useState } from 'react';
import type { TableSchemaSnapshot, TableIndex } from '@/types';
import { Section } from '@/components/ui/Section';
import { Tag } from '@/components/ui/Tag';
import { AlertTriangle, CheckCircle, XCircle, Database, Key, Hash, Columns, ChevronRight } from 'lucide-react';
import { formatDateTime, getIndexStatusColor, getIndexStatusLabel } from '@/utils/format';
import { diffText, getDiffRowClass } from '@/utils/diff';

const indexIcon = (status: string) => {
  switch (status) {
    case 'valid': return <CheckCircle className={`w-3.5 h-3.5 ${getIndexStatusColor('valid')}`} />;
    case 'invalid': return <AlertTriangle className={`w-3.5 h-3.5 ${getIndexStatusColor('invalid')} animate-pulse-slow`} />;
    case 'missing': return <XCircle className={`w-3.5 h-3.5 ${getIndexStatusColor('missing')}`} />;
    default: return <Hash className="w-3.5 h-3.5 text-gray-400" />;
  }
};

const indexToneMap: Record<string, any> = {
  PRIMARY: 'primary',
  UNIQUE: 'emerald',
  NORMAL: 'gray',
  FULLTEXT: 'violet',
};

interface SchemaSnapshotProps {
  schema?: TableSchemaSnapshot;
}

export const SchemaSnapshotView: React.FC<SchemaSnapshotProps> = ({ schema }) => {
  const [showDdlCompare, setShowDdlCompare] = useState(false);

  if (!schema) {
    return (
      <Section title={<div className="flex items-center gap-2"><Database className="w-4 h-4 text-primary-600" /><span>表结构快照</span></div>}>
        <div className="p-8 text-center text-gray-400 text-sm">暂无表结构快照数据</div>
      </Section>
    );
  }

  const hasInvalidIndex = schema.indexes.some((i) => i.status !== 'valid');
  const invalidIndex: TableIndex | undefined = schema.indexes.find((i) => i.status === 'invalid');

  const ddlDiffs = schema.previousDdl ? diffText(schema.previousDdl, schema.ddlStatement) : [];

  return (
    <Section
      tone="default"
      title={
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary-600" />
          <span>表结构快照 · {schema.tableName}</span>
          {hasInvalidIndex && (
            <Tag tone="rose">
              <AlertTriangle className="w-3 h-3 mr-0.5" />
              {schema.indexes.filter((i) => i.status !== 'valid').length} 个索引异常
            </Tag>
          )}
        </div>
      }
      subtitle={
        <div className="flex items-center gap-3 text-[11px]">
          <span>快照时间: {formatDateTime(schema.snapshotTime)}</span>
          <span>·</span>
          <span>{schema.fields.length} 个字段</span>
          <span>·</span>
          <span>{schema.indexes.length} 个索引</span>
          {schema.previousDdl && (
            <>
              <span>·</span>
              <button
                onClick={() => setShowDdlCompare(!showDdlCompare)}
                className="text-primary-600 hover:underline font-medium"
              >
                {showDdlCompare ? '隐藏DDL对比' : '查看DDL变更对比'}
              </button>
            </>
          )}
        </div>
      }
    >
      {invalidIndex && (
        <div className="mb-4 border-2 border-amber-300 bg-amber-50/70 p-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-amber-500 to-amber-300" />
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-amber-900 mb-1">
                索引失效告警 · {invalidIndex.name}
              </div>
              <div className="text-[12px] text-amber-800 space-y-1">
                <p><span className="font-semibold">根因分析：</span>{invalidIndex.invalidReason}</p>
                <p><span className="font-semibold">执行计划：</span><code className="font-mono text-amber-900 bg-amber-100 px-1 py-0.5">{invalidIndex.executionPlanHint}</code></p>
                {invalidIndex.cardinality !== undefined && (
                  <p><span className="font-semibold">当前基数：</span><span className="font-mono">{invalidIndex.cardinality.toLocaleString()}</span>（区分度极低，建议 ANALYZE TABLE 或重建索引）</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="col-span-3">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Columns className="w-3.5 h-3.5" />
            字段清单
          </div>
          <div className="overflow-auto border border-gray-200 max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2.5 py-1.5 text-left text-gray-700 font-semibold border-b border-gray-200 w-44">字段名</th>
                  <th className="px-2.5 py-1.5 text-left text-gray-700 font-semibold border-b border-gray-200 w-32">数据类型</th>
                  <th className="px-2.5 py-1.5 text-left text-gray-700 font-semibold border-b border-gray-200 w-20">可空</th>
                  <th className="px-2.5 py-1.5 text-left text-gray-700 font-semibold border-b border-gray-200 w-16">主键</th>
                  <th className="px-2.5 py-1.5 text-left text-gray-700 font-semibold border-b border-gray-200 w-28">默认值</th>
                  <th className="px-2.5 py-1.5 text-left text-gray-700 font-semibold border-b border-gray-200">注释</th>
                </tr>
              </thead>
              <tbody>
                {schema.fields
                  .sort((a, b) => a.ordinalPosition - b.ordinalPosition)
                  .map((f) => (
                    <tr key={f.name} className="border-b border-gray-100 hover:bg-primary-50/30">
                      <td className="px-2.5 py-1.5 font-mono font-medium text-gray-800">{f.name}</td>
                      <td className="px-2.5 py-1.5 font-mono text-primary-700">{f.dataType}</td>
                      <td className="px-2.5 py-1.5">
                        {f.nullable ? (
                          <Tag tone="gray">YES</Tag>
                        ) : (
                          <Tag tone="emerald">NOT NULL</Tag>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5">
                        {f.primaryKey && (
                          <Tag tone="primary">
                            <Key className="w-2.5 h-2.5 mr-0.5" />PK
                          </Tag>
                        )}
                      </td>
                      <td className="px-2.5 py-1.5 font-mono text-[11px] text-gray-600 max-w-28 truncate">
                        {f.defaultValue || '—'}
                      </td>
                      <td className="px-2.5 py-1.5 text-gray-600">{f.comment}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            索引清单
          </div>
          <div className="space-y-2">
            {schema.indexes.map((idx) => (
              <div
                key={idx.name}
                className={[
                  'border p-2.5 transition-colors',
                  idx.status === 'invalid'
                    ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50/70'
                    : idx.status === 'missing'
                    ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50/70'
                    : 'border-gray-200 bg-white hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {indexIcon(idx.status)}
                    <span className="font-mono text-xs font-semibold text-gray-800 truncate">
                      {idx.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Tag tone={indexToneMap[idx.indexType] || 'gray'} className="!text-[10px]">
                      {idx.indexType}
                    </Tag>
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 ${getIndexStatusColor(idx.status)}`}
                    >
                      {getIndexStatusLabel(idx.status)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-600">
                  <span className="text-gray-400">字段:</span>
                  <span className="font-mono text-primary-700">({idx.fields.join(', ')})</span>
                  {idx.cardinality !== undefined && (
                    <>
                      <span className="text-gray-300 mx-1">·</span>
                      <span className="text-gray-500">
                        基数 <span className="font-mono">{idx.cardinality.toLocaleString()}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showDdlCompare && schema.previousDdl && (
        <div className="border-2 border-gray-200 mt-2">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-primary-600" />
            DDL 语句变更对比（左旧 → 右新）
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="code-block rounded-none">
              <div className="px-3 py-1 text-[10px] font-mono text-gray-400 bg-gray-800 border-b border-gray-700">-- 旧版本</div>
              <pre className="!p-3"><code>{schema.previousDdl}</code></pre>
            </div>
            <div className="code-block rounded-none">
              <div className="px-3 py-1 text-[10px] font-mono text-gray-400 bg-gray-800 border-b border-gray-700">-- 新版本</div>
              <pre className="!p-3 max-h-96 overflow-y-auto">
                <code>
                  {ddlDiffs.map((d, i) => (
                    <div key={i} className={`${getDiffRowClass(d.type)} -mx-3 px-3`}>
                      {d.type !== 'equal' && (
                        <span className="inline-block w-4 text-gray-400 select-none">
                          {d.type === 'add' ? '+' : d.type === 'remove' ? '-' : '~'}
                        </span>
                      )}
                      {d.type === 'equal' && <span className="inline-block w-4" />}
                      {d.content}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
};
