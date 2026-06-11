import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ProcessingStatus, RiskLevel } from '../types';

function formatAmount(amount: number): string {
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(2)} 亿元`;
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)} 万元`;
  return `${amount} 元`;
}

function riskLevelLabel(level: RiskLevel) {
  return { high: '高风险', medium: '中风险', low: '低风险' }[level];
}

function riskLevelClass(level: RiskLevel) {
  return {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200'
  }[level];
}

function statusLabel(s: ProcessingStatus) {
  return {
    normal_passed: '正常通过',
    normal_pending: '待复核',
    anomaly_fixed: '异常已修复',
    anomaly_pending: '异常待处理',
    currency_error: '币种错误（待修正）',
    withdrawn: '已撤回'
  }[s];
}

function statusClass(s: ProcessingStatus) {
  return {
    normal_passed: 'bg-green-50 text-green-700 border-green-200',
    normal_pending: 'bg-slate-50 text-slate-700 border-slate-200',
    anomaly_fixed: 'bg-teal-50 text-teal-700 border-teal-200',
    anomaly_pending: 'bg-orange-50 text-orange-700 border-orange-200',
    currency_error: 'bg-pink-50 text-pink-700 border-pink-200',
    withdrawn: 'bg-purple-50 text-purple-700 border-purple-200'
  }[s];
}

type TabKey = 'basic' | 'notes' | 'history' | 'audit' | 'impact';

export default function RecordDetail() {
  const { selectedRecord, selectRecord, withdrawNote, addNote } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [newNote, setNewNote] = useState('');
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);
  const [withdrawConclusion, setWithdrawConclusion] = useState('');

  if (!selectedRecord) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 h-full flex flex-col items-center justify-center p-12">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-slate-500 text-center">
          <div className="font-medium mb-1">选择左侧一条记录查看详情</div>
          <div className="text-sm text-slate-400">算法值班人通常先看汇总，再抽查异常记录明细</div>
        </div>
      </div>
    );
  }

  const r = selectedRecord;
  const isCurrencyError = r.processingStatus === 'currency_error';
  const isWithdrawn = r.processingStatus === 'withdrawn';
  const hasWithdrawal = !!r.withdrawalRecord || r.manualNotes.some(n => n.isWithdrawn);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote(r.id, {
      id: `N${Date.now()}`,
      content: newNote.trim(),
      author: '阿敏',
      authorRole: '资金主管',
      createdAt: new Date().toLocaleString('zh-CN'),
      isWithdrawn: false,
      source: 'manual',
      history: []
    });
    setNewNote('');
  };

  const handleWithdrawNote = () => {
    if (!withdrawTargetId || !withdrawConclusion.trim()) return;
    withdrawNote(r.id, withdrawTargetId, '阿敏', withdrawConclusion.trim());
    setWithdrawTargetId(null);
    setWithdrawConclusion('');
  };

  const tabs: Array<{ key: TabKey; label: string; badge?: number }> = [
    { key: 'basic', label: '基本信息' },
    { key: 'notes', label: '人工备注', badge: r.manualNotes.length },
    { key: 'history', label: '判断历史', badge: r.historicalJudgments.length },
    { key: 'audit', label: '审计轨迹', badge: r.auditTrail.length },
    { key: 'impact', label: '汇总影响' }
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 h-full flex flex-col">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-slate-800">{r.bondName}</h3>
              {isCurrencyError && (
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                  数据异常·不计入正常统计
                </span>
              )}
              {hasWithdrawal && (
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  含撤回记录
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500 font-mono">{r.bondCode} · {r.id}</div>
          </div>
          <button
            onClick={() => selectRecord(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${riskLevelClass(r.riskLevel)}`}>
            {riskLevelLabel(r.riskLevel)}
          </span>
          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${statusClass(r.processingStatus)}`}>
            {statusLabel(r.processingStatus)}
          </span>
          {r.isAnomaly && (
            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              业务异常
            </span>
          )}
          <span className="text-sm text-slate-500 ml-auto">责任人：{r.responsiblePerson}</span>
        </div>
        {(isWithdrawn || r.withdrawalRecord) && r.withdrawalRecord && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 text-purple-700 font-medium text-sm mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              撤回记录已与最终结论关联（关联编号：{r.withdrawalRecord.linkedConclusionId}）
            </div>
            <div className="text-xs text-purple-600 space-y-0.5 ml-6">
              <div>撤回人：{r.withdrawalRecord.withdrawnBy}（资金主管）</div>
              <div>撤回时间：{r.withdrawalRecord.withdrawnAt}</div>
              <div>撤回原因：{r.withdrawalRecord.withdrawnReason}</div>
            </div>
          </div>
        )}
        {isCurrencyError && (
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-2">
            <div className="text-sm text-pink-700 font-medium mb-1">⚠️ 币种录入错误</div>
            <div className="text-xs text-pink-600">
              该记录币种录入与合同不符（录入：{r.currency}，应为：CNY），属于小样例测试数据混入。
              <span className="font-medium"> 处理结果不标记为正常通过，不计入风险统计。</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-b border-slate-200 px-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-bond-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-bond-600" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
        {activeTab === 'basic' && (
          <div className="space-y-5">
            <div>
              <div className="text-xs text-slate-500 mb-1">发行人</div>
              <div className="text-sm text-slate-800">{r.issuer}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">募集日期</div>
                <div className="text-sm text-slate-800">{r.raiseDate}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">募集金额</div>
                <div className="text-sm text-slate-800 font-medium">{formatAmount(r.raiseAmount)} {r.currency}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">风险类型</div>
              <div className="text-sm text-slate-800">{r.riskType}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">风险描述</div>
              <div className={`p-3 rounded-lg text-sm ${isCurrencyError ? 'bg-pink-50 text-pink-800 border border-pink-100' : 'bg-slate-50 text-slate-700 border border-slate-100'}`}>
                {r.riskDescription}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">处理结果</div>
              <div className={`p-3 rounded-lg text-sm ${
                isCurrencyError
                  ? 'bg-pink-50 text-pink-800 border border-pink-200'
                  : r.processingStatus.includes('anomaly')
                    ? 'bg-orange-50 text-orange-800 border border-orange-200'
                    : isWithdrawn
                      ? 'bg-purple-50 text-purple-800 border border-purple-200'
                      : 'bg-green-50 text-green-800 border border-green-200'
              }`}>
                {r.processingResult}
              </div>
            </div>
            {r.anomalyReason && (
              <div>
                <div className="text-xs text-slate-500 mb-1">异常原因</div>
                <div className="p-3 rounded-lg bg-orange-50 text-orange-800 border border-orange-100 text-sm">
                  {r.anomalyReason}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-xs text-slate-600 mb-2">新增备注（将计入历史，不可删除，可撤回）</div>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="资金主管阿敏在此填写备注..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 resize-none"
                rows={2}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-bond-600 rounded-md hover:bg-bond-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  提交备注
                </button>
              </div>
            </div>

            {r.manualNotes.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8">暂无备注</div>
            )}

            {r.manualNotes.map((note) => (
              <div
                key={note.id}
                className={`border rounded-lg p-4 ${
                  note.isWithdrawn
                    ? 'bg-slate-50 border-slate-200 opacity-70'
                    : note.source === 'supplement'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{note.author}</span>
                    <span className="text-xs text-slate-500">（{note.authorRole}）</span>
                    <span className="text-xs text-slate-400">{note.createdAt}</span>
                    {note.source === 'supplement' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">补充说明</span>
                    )}
                    {note.source === 'manual' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-bond-100 text-bond-700">人工备注</span>
                    )}
                    {note.isWithdrawn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-300 text-slate-700">已撤回</span>
                    )}
                    {!note.isWithdrawn && note.authorRole === '资金主管' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">最终结论</span>
                    )}
                  </div>
                  {!note.isWithdrawn && note.source === 'supplement' && (
                    <button
                      onClick={() => {
                        setWithdrawTargetId(note.id);
                        setWithdrawConclusion('');
                      }}
                      className="text-xs text-slate-500 hover:text-purple-700 underline"
                    >
                      撤回此说明
                    </button>
                  )}
                </div>
                <div className={`text-sm ${note.isWithdrawn ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                  {note.content}
                </div>
                {note.isWithdrawn && note.withdrawnAt && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                    由 {note.withdrawnBy} 于 {note.withdrawnAt} 撤回
                    {note.linkedConclusionId && `，关联最终结论编号：${note.linkedConclusionId}`}
                  </div>
                )}
                {note.history.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-dashed border-slate-200">
                    <div className="text-xs text-slate-500 mb-1.5">修改历史（共 {note.history.length} 次）：</div>
                    <div className="space-y-1.5">
                      {note.history.map((h, idx) => (
                        <div key={idx} className="text-xs bg-white rounded p-2 border border-slate-100">
                          <div className="text-slate-500 mb-0.5">
                            {h.modifiedAt} — {h.modifiedBy}（{h.modifiedByRole}）
                          </div>
                          <div className="text-slate-700">{h.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {withdrawTargetId && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 mx-4">
                  <h4 className="text-base font-semibold text-slate-800 mb-3">撤回补充说明</h4>
                  <p className="text-sm text-slate-600 mb-4">
                    撤回后原说明将保留历史（划线显示），请填写<span className="font-medium text-purple-700">最终结论</span>以关联撤回记录：
                  </p>
                  <textarea
                    value={withdrawConclusion}
                    onChange={(e) => setWithdrawConclusion(e.target.value)}
                    placeholder="请填写最终结论，说明撤回原因和正确结论..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => {
                        setWithdrawTargetId(null);
                        setWithdrawConclusion('');
                      }}
                      className="px-4 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleWithdrawNote}
                      disabled={!withdrawConclusion.trim()}
                      className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      确认撤回并关联结论
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {r.historicalJudgments.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8">暂无判断历史</div>
            )}
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
              {r.historicalJudgments.map((j, idx) => (
                <div key={j.id} className="relative pl-11 pb-4">
                  <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 border-white ${
                    j.isFinal ? 'bg-red-500' : 'bg-slate-400'
                  }`}>
                    {j.isFinal && (
                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg border ${
                    j.isFinal
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{j.judger}</span>
                        <span className="text-xs text-slate-500">{j.judgerRole}</span>
                        {j.isFinal && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white">最终结论</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{j.judgedAt}</span>
                    </div>
                    <div className={`text-sm font-medium mb-1 ${j.isFinal ? 'text-red-800' : 'text-slate-700'}`}>
                      {j.judgment}
                    </div>
                    <div className="text-xs text-slate-500">理由：{j.reason}</div>
                    {idx < r.historicalJudgments.length - 1 && (
                      <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-xs text-purple-600">
                        ↓ 下一班次可查看此变更历史，不会被最终结果覆盖
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-3">
            {r.auditTrail.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8">暂无审计轨迹</div>
            )}
            {r.auditTrail.map((a) => (
              <div key={a.id} className="p-3 rounded-lg bg-white border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{a.changedBy}</span>
                    <span className="text-xs text-slate-500">{a.changedByRole}</span>
                  </div>
                  <span className="text-xs text-slate-400">{a.changedAt}</span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="text-slate-500">字段：<code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">{a.field}</code></div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded shrink-0">原值</span>
                    <span className="text-sm text-slate-700">{a.oldValue}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs px-1.5 py-0.5 bg-bond-100 text-bond-700 rounded shrink-0">新值</span>
                    <span className="text-sm text-bond-800 font-medium">{a.newValue}</span>
                  </div>
                  {a.reason && (
                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 mt-1">变更原因：{a.reason}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="space-y-4">
            <div className="bg-bond-50 border border-bond-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-bond-800 font-medium text-sm mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                汇总影响说明
              </div>
              <div className="text-sm text-bond-700 leading-relaxed">
                {r.summaryImpact}
              </div>
            </div>
            <div className="text-sm text-slate-500">
              算法值班人可通过此说明理解：当抽查该条异常记录时，为什么汇总面板上的统计数字会变化或不变化。
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">是否计入风险统计</div>
                <div className={`text-sm font-medium ${
                  isCurrencyError || isWithdrawn ? 'text-slate-400' : 'text-green-700'
                }`}>
                  {isCurrencyError ? '否（币种错误）' : isWithdrawn ? '否（已撤回）' : '是'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">处理结果标识</div>
                <div className={`text-sm font-medium ${
                  isCurrencyError
                    ? 'text-pink-700'
                    : r.processingStatus.includes('anomaly')
                      ? 'text-orange-700'
                      : isWithdrawn
                        ? 'text-purple-700'
                        : 'text-green-700'
                }`}>
                  {statusLabel(r.processingStatus)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
