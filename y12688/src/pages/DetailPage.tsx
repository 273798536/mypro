import { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useData } from '../store/DataContext';
import { StatusBadge, TypeBadge } from '../components/Badges';
import { FIELD_NAMES } from '../utils/constants';
import { formatDateTime } from '../utils/helpers';
import { RecordStatus } from '../types';
import { STATUS_LABELS } from '../utils/constants';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecordById, getBatchById, getRelatedRecords, getSectionsByRecordId, updateRecordOpinion, updateRecordStatus } = useData();

  const record = id ? getRecordById(id) : undefined;
  const batch = record ? getBatchById(record.batchId) : undefined;
  const related = record ? getRelatedRecords(record.id) : [];
  const sections = record ? getSectionsByRecordId(record.id) : [];

  const [opinion, setOpinion] = useState(record?.processingOpinion || '');
  const [editing, setEditing] = useState(false);

  const diffFields = useMemo(() => {
    if (!record || related.length === 0) return [];
    const fields: { field: string; self: any; others: { id: string; value: any }[] }[] = [];
    const allKeys = new Set<string>();
    Object.keys(record.data).forEach(k => allKeys.add(k));
    related.forEach(r => Object.keys(r.data).forEach(k => allKeys.add(k)));

    for (const key of allKeys) {
      const selfVal = JSON.stringify(record.data[key]);
      const others = related.map(r => ({ id: r.id, value: r.data[key] }));
      const hasDiff = others.some(o => JSON.stringify(o.value) !== selfVal);
      if (hasDiff) {
        fields.push({ field: key, self: record.data[key], others });
      }
    }
    return fields;
  }, [record, related]);

  if (!record) {
    return (
      <div className="text-center py-20">
        <div className="text-slate-500 text-sm">未找到该记录，可能已被删除。</div>
        <button onClick={() => navigate('/filter')} className="mt-4 px-4 py-2 text-sm bg-tech-blue text-white rounded hover:bg-tech-blue/90">
          返回筛选页
        </button>
      </div>
    );
  }

  function saveOpinion() {
    if (!record) return;
    updateRecordOpinion(record.id, opinion);
    setEditing(false);
  }

  function prettyValue(v: any): string {
    if (v == null) return '-';
    if (typeof v === 'object') return JSON.stringify(v, null, 2);
    return String(v);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800 text-sm">← 返回</button>
          <h3 className="text-lg font-semibold text-slate-800">记录详情</h3>
          <TypeBadge type={record.type} size="md" />
          <StatusBadge status={record.status} size="md" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/section/${record.id}`)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
          >
            查看剖切分析
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">来源信息（用于甲方追溯）</h4>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <DetailRow label="记录 ID" value={<span className="font-mono text-xs text-slate-500">{record.id}</span>} />
              <DetailRow label="批次" value={batch ? (
                <Link to={`/filter?batchId=${batch.id}`} className="text-tech-blue hover:underline">
                  {batch.name}
                </Link>
              ) : record.batchId} />
              <DetailRow label="原始文件名" value={<span className="font-mono text-xs">{record.fileName}</span>} />
              <DetailRow label="原始行号" value={<span className="inline-block bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">第 {record.originalLine} 行</span>} />
              <DetailRow label="图片名" value={record.imageName ? <span className="text-cyan-700">🖼 {record.imageName}</span> : <span className="text-slate-400">-</span>} />
              <DetailRow label="导入时间" value={formatDateTime(record.createdAt)} />
              <DetailRow label="最后更新" value={formatDateTime(record.updatedAt)} />
              <DetailRow label="来源备注" value={
                <div className="bg-ocean-light/40 px-2.5 py-1.5 rounded text-xs text-deep-sea border border-ocean-light">
                  {record.sourceRemark || '-'}
                </div>
              } full />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700">数据内容</h4>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                {Object.entries(record.data).map(([k, v]) => (
                  <DetailRow key={k} label={FIELD_NAMES[k] || k} value={
                    <pre className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 overflow-x-auto max-w-full whitespace-pre-wrap break-words">
                      {prettyValue(v)}
                    </pre>
                  } />
                ))}
              </div>
              {record.type === 'model' && record.data.cameraAngle == null && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                  ⚠ 该三维模型未包含相机视角参数（可能导致导入后视角丢失）。建议补录后重新导入，避免出现两份互相打架的结论。
                </div>
              )}
            </div>
          </div>

          {diffFields.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200 shadow-sm">
              <div className="px-5 py-3 border-b border-red-100 bg-red-50/50">
                <h4 className="text-sm font-semibold text-red-700">⚠ 与关联记录存在字段冲突</h4>
              </div>
              <div className="p-5 space-y-3">
                {diffFields.map(df => (
                  <div key={df.field} className="border border-slate-200 rounded p-3">
                    <div className="text-xs font-medium text-slate-700 mb-2">{FIELD_NAMES[df.field] || df.field}</div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${df.others.length + 1}, 1fr)` }}>
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="text-[10px] text-green-700 mb-1">当前记录</div>
                        <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-words">{prettyValue(df.self)}</pre>
                      </div>
                      {df.others.map((o, i) => (
                        <div key={i} className="bg-red-50 border border-red-200 rounded p-2">
                          <button
                            onClick={() => navigate(`/detail/${o.id}`)}
                            className="text-[10px] text-red-600 mb-1 hover:underline"
                          >
                            冲突记录 #{i + 1} →
                          </button>
                          <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-words">{prettyValue(o.value)}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sections.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">剖切分析结论（点击跳转到剖切页）</h4>
                <button onClick={() => navigate(`/section/${record.id}`)} className="text-xs text-tech-blue hover:underline">
                  打开剖切页 →
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {sections.map(s => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="text-sm font-medium text-slate-800">切片 #{s.sliceIndex + 1}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.conclusion}</div>
                    </div>
                    <span className="text-xs text-slate-400">{formatDateTime(s.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">处理意见</h4>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-xs text-tech-blue hover:underline">
                  编辑
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button onClick={() => { setEditing(false); setOpinion(record.processingOpinion || ''); }} className="text-xs text-slate-500 hover:underline">
                    取消
                  </button>
                  <button onClick={saveOpinion} className="text-xs text-tech-blue font-medium hover:underline">
                    保存
                  </button>
                </div>
              )}
            </div>
            <div className="p-5">
              {editing ? (
                <textarea
                  value={opinion}
                  onChange={e => setOpinion(e.target.value)}
                  rows={5}
                  placeholder="记录处理意见、复核结论或甲方疑问答复..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-tech-blue/40 resize-none"
                />
              ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap min-h-[80px] bg-slate-50 p-3 rounded border border-slate-100">
                  {record.processingOpinion || <span className="text-slate-400 italic">暂未记录处理意见</span>}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700">状态调整</h4>
            </div>
            <div className="p-5 space-y-2">
              {(Object.keys(STATUS_LABELS) as RecordStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => { if (confirm(`将状态调整为"${STATUS_LABELS[s].label}"？`)) updateRecordStatus(record.id, s); }}
                  className={`w-full text-left text-xs px-3 py-2 rounded border transition ${
                    record.status === s
                      ? `${STATUS_LABELS[s].bg} ${STATUS_LABELS[s].color} font-medium`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {STATUS_LABELS[s].label}{record.status === s && ' ✓'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700">关联记录 ({related.length})</h4>
            </div>
            <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin">
              {related.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">无关联记录</div>
              ) : (
                related.map(r => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/detail/${r.id}`)}
                    className="w-full text-left p-2.5 rounded border border-slate-200 hover:bg-ocean-light/30 hover:border-tech-blue/30 transition"
                  >
                    <div className="flex items-center gap-1.5">
                      <TypeBadge type={r.type} />
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs font-medium text-slate-800 mt-1">
                      {r.data.name || r.data.buoyId || r.data.modelId || r.data.deviceId || '(未命名)'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {r.fileName} · L{r.originalLine}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-slate-800">{value}</div>
    </div>
  );
}
