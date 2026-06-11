import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Image, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/appStore.js';
import { StatusBadge, ObjectTypeBadge } from '@/components/StatusBadge.js';
import { formatDate } from '@/lib/api.js';
import type { CaseStatus, ObjectType, PreReviewCase } from '../../shared/types.js';
import { STATUS_LABEL, OBJECT_TYPE_LABEL } from '../../shared/types.js';

export default function CaseListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cases, caseQuery, setCaseQuery, loadCases, loading } = useAppStore();
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');

  const statusFromUrl = (searchParams.get('status') as CaseStatus) || undefined;
  const objectTypeFromUrl = (searchParams.get('objectType') as ObjectType) || undefined;

  useEffect(() => {
    setCaseQuery({ status: statusFromUrl, objectType: objectTypeFromUrl, keyword: searchParams.get('keyword') || undefined });
  }, [objectTypeFromUrl, searchParams, setCaseQuery, statusFromUrl]);

  useEffect(() => {
    loadCases();
  }, [caseQuery, loadCases]);

  const updateFilter = (patch: Partial<typeof caseQuery>) => {
    const next = { ...caseQuery, ...patch };
    setCaseQuery(next);
    const sp = new URLSearchParams();
    if (next.status) sp.set('status', next.status);
    if (next.objectType) sp.set('objectType', next.objectType);
    if (next.keyword) sp.set('keyword', next.keyword);
    setSearchParams(sp);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, pending: 0, approved: 0, rejected: 0, abnormal: 0 };
    cases.forEach((cs) => {
      c.all++;
      c[cs.status]++;
    });
    return c;
  }, [cases]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-marine-800 font-mono">预审案件列表</h2>
        <p className="text-sm text-slate-500 mt-0.5">点击任一案件进入详情，完成复核、改判或追溯巡检照片原始数据</p>
      </div>

      <div className="eng-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">状态</span>
          <FilterPill
            label={`全部 (${counts.all})`}
            active={!caseQuery.status}
            onClick={() => updateFilter({ status: undefined })}
          />
          {(Object.keys(STATUS_LABEL) as CaseStatus[]).map((s) => (
            <FilterPill
              key={s}
              label={`${STATUS_LABEL[s]} (${counts[s] || 0})`}
              active={caseQuery.status === s}
              onClick={() => updateFilter({ status: s })}
              tone={s}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">对象类型</span>
          <FilterPill
            label="全部"
            active={!caseQuery.objectType}
            onClick={() => updateFilter({ objectType: undefined })}
          />
          {(Object.keys(OBJECT_TYPE_LABEL) as ObjectType[]).map((t) => (
            <FilterPill
              key={t}
              label={OBJECT_TYPE_LABEL[t]}
              active={caseQuery.objectType === t}
              onClick={() => updateFilter({ objectType: t })}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateFilter({ keyword: keyword.trim() || undefined });
              }}
              placeholder="搜索案件编号、位置、碰撞描述…"
              className="eng-input pl-9"
            />
          </div>
          <button className="eng-btn-primary" onClick={() => updateFilter({ keyword: keyword.trim() || undefined })}>
            搜索
          </button>
          {(caseQuery.status || caseQuery.objectType || caseQuery.keyword) && (
            <button
              className="eng-btn"
              onClick={() => {
                setKeyword('');
                updateFilter({ status: undefined, objectType: undefined, keyword: undefined });
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      <div className="eng-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="eng-table">
            <thead>
              <tr>
                <th>案件编号</th>
                <th>位置</th>
                <th>碰撞对象</th>
                <th>对象类型</th>
                <th>状态</th>
                <th>巡检照片</th>
                <th>晚到附件</th>
                <th>最后操作</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">加载中…</td>
                </tr>
              )}
              {!loading && cases.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">暂无数据</td>
                </tr>
              )}
              {!loading && cases.map((cs, idx) => (
                <CaseRow key={cs.id} cs={cs} index={idx} onOpen={() => navigate(`/cases/${cs.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label, active, onClick, tone,
}: { label: string; active: boolean; onClick: () => void; tone?: CaseStatus }) {
  const toneBg: Record<string, string> = {
    pending: 'bg-sky-500 border-sky-600 text-white',
    approved: 'bg-emerald-500 border-emerald-600 text-white',
    rejected: 'bg-red-500 border-red-600 text-white',
    abnormal: 'bg-amber-500 border-amber-600 text-white',
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-sm border-2 transition-all ${
        active
          ? (tone ? toneBg[tone] : 'bg-marine-700 border-marine-800 text-white shadow-engineering')
          : 'bg-white border-slate-200 text-slate-600 hover:border-marine-300 hover:text-marine-700'
      }`}
    >
      {label}
    </button>
  );
}

function CaseRow({ cs, index, onOpen }: { cs: PreReviewCase; index: number; onOpen: () => void }) {
  return (
    <tr style={{ animation: `staggerFade 0.4s ease-out ${index * 60}ms both` }}>
      <td className="font-mono text-sm font-semibold text-marine-700">{cs.caseNumber}</td>
      <td className="text-slate-700">{cs.location}</td>
      <td className="text-slate-700 max-w-xs">
        <div className="line-clamp-1" title={cs.collisionSummary}>{cs.collisionSummary}</div>
      </td>
      <td><ObjectTypeBadge type={cs.objectType} /></td>
      <td><StatusBadge status={cs.status} /></td>
      <td>
        <span className="inline-flex items-center gap-1 text-sm text-slate-600">
          <Image className="w-3.5 h-3.5" />
          {cs.photoCount} 张
        </span>
      </td>
      <td>
        {cs.hasLateAttachment ? (
          <span className="eng-chip bg-amber-50 text-amber-700 border-amber-200 animate-breath">
            <AlertTriangle className="w-3 h-3" />
            晚到
          </span>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </td>
      <td>
        <div className="text-sm text-slate-600 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(cs.updatedAt)}</span>
          <span className="text-slate-400">·</span>
          <span className="text-marine-700 font-medium">{cs.lastOperator}</span>
        </div>
      </td>
      <td className="text-right">
        <button onClick={onOpen} className="eng-btn-primary !px-3 !py-1.5 text-xs">
          复核
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}
