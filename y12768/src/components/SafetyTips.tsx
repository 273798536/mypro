import React from 'react';
import { useApp } from '../context/AppContext';
import { findDuplicateBatches } from '../utils/analysis';

export function SafetyTips() {
  const { state, markSafetyReviewed, resetToSampleData } = useApp();
  const duplicates = findDuplicateBatches(state.records);
  const pendingRecords = state.records.filter(r => r.conclusion === 'pending');
  const missingLedgerRecords = state.records.filter(r => r.reagentLedgerIds.length === 0);

  const today = new Date();
  const lastReview = state.lastSafetyReviewDate
    ? new Date(state.lastSafetyReviewDate)
    : null;
  const isEndOfMonth = today.getDate() >= 25;
  const needReview = !lastReview ||
    (today.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24) > 20;

  return (
    <div>
      <div className="card">
        <div className="card-title">
          安全提示（月底/课前查看）
          <span className="card-subtitle">
            上次复核：{lastReview ? state.lastSafetyReviewDate : '从未'}
          </span>
        </div>

        {(isEndOfMonth || needReview) && (
          <div className="safety-tip">
            <h4>⏰ 复核提醒</h4>
            <ul>
              {isEndOfMonth && <li>月底将至，请完成本月所有盐雾试验记录的安全员复核</li>}
              {needReview && <li>距上次安全复核已超过20天，建议进行一次全面数据核查</li>}
              <li>请重点检查批号重复、结论待确认、缺少试剂台账的记录</li>
            </ul>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="alert alert-error">
            <div>
              <strong>🚨 发现 {duplicates.length} 个重复批号，需立即处理</strong>
              <ul>
                {duplicates.map(d => (
                  <li key={d.batchNo}>
                    批号「<code>{d.batchNo}</code>」有 {d.recordIds.length} 条记录，
                    {d.hasConflictingConclusions
                      ? <span className="text-danger">存在结论冲突！</span>
                      : '结论一致但需确认是否合并'}
                    。影响：{d.affectedConclusions.slice(0, 2).join('；')}
                    {d.affectedConclusions.length > 2 && ` 等${d.affectedConclusions.length}条`}
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-2">请前往「批号追踪」页面处理合并，确保同一件事不出现两份结论。</p>
            </div>
          </div>
        )}

        {pendingRecords.length > 0 && (
          <div className="alert alert-warning">
            <div>
              <strong>⚠ {pendingRecords.length} 条记录待复核确认</strong>
              <ul>
                {pendingRecords.slice(0, 5).map(r => (
                  <li key={r.id}>
                    {r.sampleName}（批号：{r.batchNo}）— {r.operator} 于 {r.testDate} 录入
                    {r.remark && `：${r.remark}`}
                  </li>
                ))}
                {pendingRecords.length > 5 && <li>...另有 {pendingRecords.length - 5} 条待复核</li>}
              </ul>
              <p className="text-sm mt-2">请在「评级记录」页面点击"复核"按钮逐条处理。</p>
            </div>
          </div>
        )}

        {missingLedgerRecords.length > 0 && (
          <div className="alert alert-info">
            <div>
              <strong>ℹ {missingLedgerRecords.length} 条记录缺少试剂台账关联</strong>
              <ul>
                {missingLedgerRecords.map(r => (
                  <li key={r.id}>
                    {r.sampleName}（批号：{r.batchNo}）
                    {r.remark ? `：${r.remark}` : '：未关联任何试剂使用记录'}
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-2">
                请先在「试剂台账」页面补充对应试剂的使用记录，然后编辑这些评级记录关联上台账。
                缺少试剂台账的记录在导出报告时会被标记为数据不完整。
              </p>
            </div>
          </div>
        )}

        {duplicates.length === 0 && pendingRecords.length === 0 && missingLedgerRecords.length === 0 && (
          <div className="alert alert-success">
            <div>
              <strong>✅ 数据状态良好</strong>
              <p className="text-sm mt-1">
                当前无重复批号、无待复核记录、所有记录均已关联试剂台账。
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button className="btn btn-success" onClick={markSafetyReviewed}>
            ✓ 标记本次已复核
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (confirm('确认重置为示例数据？当前所有数据将丢失！')) {
                resetToSampleData();
              }
            }}
          >
            🔄 重置为示例数据
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          盐雾试验操作安全规范
          <span className="card-subtitle">课前必读</span>
        </div>
        <div className="safety-tip" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <h4 style={{ color: '#166534' }}>🧪 试验前准备</h4>
          <ul style={{ color: '#14532d' }}>
            <li>检查氯化钠试剂是否在有效期内，确认试剂台账登记完整</li>
            <li>确认盐雾试验箱接地良好，喷淋系统无堵塞</li>
            <li>佩戴防护手套、护目镜，穿好实验服</li>
            <li>检查样品编号与批号是否对应，避免录入错误</li>
          </ul>
        </div>
        <div className="safety-tip mt-4" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <h4 style={{ color: '#1e40af' }}>⚙️ 试验中注意事项</h4>
          <ul style={{ color: '#1e3a8a' }}>
            <li>试验过程中严禁打开试验箱门，防止盐雾外泄</li>
            <li>设置的试验时长需与方案一致，不得中途修改</li>
            <li>定时（每24小时）记录设备运行参数并登记台账</li>
            <li>如遇设备异常，立即停机并报告，不得自行拆修</li>
          </ul>
        </div>
        <div className="safety-tip mt-4" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <h4 style={{ color: '#991b1b' }}>🛡️ 试验结束后处理</h4>
          <ul style={{ color: '#7f1d1d' }}>
            <li>取出样品前先排风30分钟，待盐雾沉降后再开门</li>
            <li>评级时需对照标准评级图板，由双人确认</li>
            <li>所有接触过盐雾的器皿需用清水反复冲洗</li>
            <li>废液需中和处理后排放，不得直接倒入下水道</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
