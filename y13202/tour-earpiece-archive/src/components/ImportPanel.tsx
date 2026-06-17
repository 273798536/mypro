import { useState } from 'react';
import { useStore } from '../store';
import { parseRehearsalText } from '../utils/textParser';
import { DEMO_RAW_TEXT, DEMO_INTRO } from '../data/demo';
import type { ImportResult, IssueType } from '../types';

const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  duplicate_song_alias: '曲名别名重复',
  missing_field: '字段缺失',
  date_format_unclear: '日期格式/非法',
  hidden_auth_in_note: '授权藏于备注',
  duplicate_record: '重复记录',
  late_note_added: '后补备注',
  format_unrecognized: '格式无法识别',
};

export function ImportPanel() {
  const { state, dispatch } = useStore();
  const [text, setText] = useState('');
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleImport = () => {
    if (!text.trim()) return;
    const result = parseRehearsalText(text, state.items);
    dispatch({ type: 'IMPORT', payload: result });
    setLastResult(result);
    setShowDetail(true);
    setText('');
  };

  const handleLoadDemo = () => {
    setText(DEMO_RAW_TEXT);
  };

  const issueSummary: Array<{ type: IssueType; count: number; errors: number; warnings: number; infos: number }> = [];
  if (lastResult) {
    const map = new Map<IssueType, { count: number; errors: number; warnings: number; infos: number }>();
    for (const iss of lastResult.issues) {
      const bucket = map.get(iss.type) ?? { count: 0, errors: 0, warnings: 0, infos: 0 };
      bucket.count++;
      if (iss.severity === 'error') bucket.errors++;
      else if (iss.severity === 'warning') bucket.warnings++;
      else bucket.infos++;
      map.set(iss.type, bucket);
    }
    for (const [type, v] of map.entries()) {
      issueSummary.push({ type, ...v });
    }
    issueSummary.sort((a, b) => b.count - a.count);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">导入排练群文本</h2>
        <button
          onClick={handleLoadDemo}
          className="text-xs px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
        >
          加载演示数据
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'粘贴排练群截图转写的文本，每行一条记录\n支持格式：曲名  艺人  授权日期  备注（字段间用Tab或2+空格分隔）'}
        className="w-full h-40 p-3 text-sm border border-gray-300 rounded font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      {text && (text.includes('演示') || DEMO_RAW_TEXT.includes(text.split('\n')[0] ?? '')) ? (
        <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded whitespace-pre-line">
          {DEMO_INTRO}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          {lastResult && (
            <>
              <span>
                上次导入：共 <b className="text-gray-700">{lastResult.totalLines}</b> 行 · 成功{' '}
                <b className="text-green-600">{lastResult.success.length}</b> 条 · 失败{' '}
                <b className={`${lastResult.failed.length > 0 ? 'text-red-600' : ''}`}>
                  {lastResult.failed.length}
                </b>{' '}
                条 · 问题 <b className="text-amber-600">{lastResult.issues.length}</b> 个
              </span>
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="px-2 py-0.5 rounded border border-indigo-300 text-indigo-600 hover:bg-indigo-50"
              >
                {showDetail ? '收起明细' : '展开明细'}
              </button>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setText('')}
            className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            清空
          </button>
          <button
            onClick={handleImport}
            disabled={!text.trim()}
            className="text-xs px-4 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            导入并归档
          </button>
        </div>
      </div>

      {lastResult && showDetail && (
        <div className="border border-gray-200 rounded divide-y divide-gray-100">
          {issueSummary.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                问题类型统计（按问题计）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issueSummary.map((s) => (
                  <span
                    key={s.type}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border ${
                      s.errors > 0
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : s.warnings > 0
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'bg-sky-50 border-sky-300 text-sky-700'
                    }`}
                  >
                    <b>{ISSUE_TYPE_LABEL[s.type] ?? s.type}</b>
                    <span className="opacity-60">·</span>
                    <span>{s.count}</span>
                    <span className="opacity-60">（</span>
                    {s.errors > 0 && <span className="text-red-600">错{s.errors} </span>}
                    {s.warnings > 0 && <span className="text-amber-600">警{s.warnings} </span>}
                    {s.infos > 0 && <span className="text-sky-600">提{s.infos}</span>}
                    <span className="opacity-60">）</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {lastResult.success.length > 0 && (
            <div className="p-3 space-y-2">
              <div className="text-[11px] font-semibold text-green-700 uppercase tracking-wider">
                归档成功（{lastResult.success.length} 条）· 含问题数 {lastResult.success.reduce((n, i) => n + i.issues.length, 0)}
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 w-14">行号</th>
                      <th className="text-left px-2 py-1 w-28">曲名</th>
                      <th className="text-left px-2 py-1 w-24">艺人</th>
                      <th className="text-left px-2 py-1 w-28">授权期限</th>
                      <th className="text-left px-2 py-1">问题</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lastResult.success.map((item) => (
                      <tr
                        key={item.id}
                        className={item.issues.some((i) => i.severity === 'error') ? 'bg-red-50/50' : ''}
                      >
                        <td className="px-2 py-1 text-gray-400">#{item.rawLineNumber}</td>
                        <td className="px-2 py-1 text-gray-800 font-medium truncate max-w-[160px]" title={item.songName}>
                          {item.songName || '（缺曲名）'}
                        </td>
                        <td className="px-2 py-1 text-gray-700 truncate max-w-[120px]" title={item.artist}>
                          {item.artist || '—'}
                        </td>
                        <td className="px-2 py-1 truncate max-w-[140px]" title={item.authDeadlineRaw ?? ''}>
                          {item.authDeadline ? (
                            <span className={item.authExtractedFromNote ? 'text-sky-600' : 'text-gray-800'}>
                              {item.authDeadline}
                            </span>
                          ) : item.authDeadlineRaw ? (
                            <span className="text-red-600" title="提供了原始值但解析失败">
                              ⚠ {item.authDeadlineRaw}
                            </span>
                          ) : (
                            <span className="text-amber-600">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          {item.issues.length === 0 ? (
                            <span className="text-green-600">✓ 无</span>
                          ) : (
                            <div className="flex flex-wrap gap-0.5">
                              {item.issues.slice(0, 4).map((iss) => (
                                <span
                                  key={iss.id}
                                  className={`inline-block px-1 text-[10px] rounded border ${
                                    iss.severity === 'error'
                                      ? 'bg-red-100 border-red-300 text-red-700'
                                      : iss.severity === 'warning'
                                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                                        : 'bg-sky-100 border-sky-300 text-sky-700'
                                  }`}
                                  title={iss.message}
                                >
                                  {ISSUE_TYPE_LABEL[iss.type] ?? iss.type}
                                </span>
                              ))}
                              {item.issues.length > 4 && (
                                <span className="text-[10px] text-gray-500">+{item.issues.length - 4}</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lastResult.failed.length > 0 && (
            <div className="p-3 space-y-2 bg-red-50/40">
              <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">
                失败 / 无法归档（{lastResult.failed.length} 行）· 需人工按原始行追溯
              </div>
              <div className="max-h-48 overflow-y-auto border border-red-200 rounded bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-red-100/50 text-red-700 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 w-14">行号</th>
                      <th className="text-left px-2 py-1">原始文本</th>
                      <th className="text-left px-2 py-1 w-56">失败原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {lastResult.failed.map((f, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1 text-red-500 font-mono">#{f.lineNumber}</td>
                        <td className="px-2 py-1 text-gray-800 font-mono text-[11px] whitespace-pre-wrap break-all max-w-xs">
                          {f.rawText}
                        </td>
                        <td className="px-2 py-1 text-red-600 text-[11px]">{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
