const HandoverView = (function () {
  let currentStep = 0;
  const testSteps = [
    {
      id: 1,
      title: '第一步：先看汇总统计，了解本月概况',
      desc: '假设你是接手同事，先打开"汇总统计"页。本月预付款审批共6笔，其中1笔状态为"已调整"（金额¥285,000），这是月底补录银行备注导致的异常。点击"已调整"统计卡片查看异常明细。',
      action: 'goto-summary-modified'
    },
    {
      id: 2,
      title: '第二步：抽查一条异常记录（ap_005 顺达化工）',
      desc: '在联动筛选出的异常明细中，找到 ap_005 佛山顺达化工的记录，点击"追溯变化"按钮，查看这笔记录为什么从"预付款"变成了"已调整"。',
      action: 'trace-ap005'
    },
    {
      id: 3,
      title: '第三步：从追溯界面回到银行流水找原始说法',
      desc: '在追溯变化页面，底部能看到关联银行流水的原始摘要"化工原料预付款"和补录备注"结清5月货款"。点击"查看银行流水"按钮，去银行流水页核对原始凭证。',
      action: 'goto-tx005'
    },
    {
      id: 4,
      title: '第四步：从银行流水看完整备注补录历史和影响范围',
      desc: '在银行流水 tx_005 的详情中，查看"备注历史"和"变更审计"，可以看到小周月底补录了"结清5月货款"备注，系统自动记录了3项影响范围，其中包括"本月预付款汇总统计减少¥285,000"。',
      action: 'verify-tx005'
    },
    {
      id: 5,
      title: '第五步：从截图说明看处理结果是怎么定的',
      desc: '回到审批 ap_005 详情，查看"截图说明"区域，截图描述为"银行流水补录备注截图-顺达化工"，处理结果明确写着：银行月底补录备注"结清5月货款"，原预付款判定调整为应付尾款核销。',
      action: 'goto-ap005-screenshot'
    },
    {
      id: 6,
      title: '第六步：查看小周改过的所有判断历史（不止看最终结果）',
      desc: '审批判断共有2个版本。版本1："紧急补货预付款，流程合规同意支付"；版本2（当前）："月底临时补备注：实为上月尾款结清，非本月预付款"。下一班同事能看到完整变更过程，而不只是最终结论。',
      action: 'verify-judgment-history'
    },
    {
      id: 7,
      title: '第七步：再看一个审批人改名案例（ap_003 明辉包装）',
      desc: '审批 ap_003 广州明辉包装，原审批人刘强休产假，变更为王芳。在变更审计中可以找到：来源行为"采购部人事通知-20260605"，影响范围已记录。',
      action: 'goto-ap003'
    },
    {
      id: 8,
      title: '第八步：验证筛选条件、统计、明细同源',
      desc: '回到汇总统计页，调整筛选条件（如仅看"已通过"状态），统计卡片、明细列表会同步变化。导出截图时，筛选条件、数字、明细表完全一致，不会出现手工核对时"截图和数字对不上"的问题。',
      action: 'verify-homology'
    },
    {
      id: 9,
      title: '交接完成 ✅',
      desc: '恭喜！你已走完一遍标准交接流程。核心要点：(1) 汇总→明细→追溯 三层联动；(2) 银行流水、审批、截图、审计 双向追溯；(3) 所有临时修改都在历史中完整留存，不会被覆盖。',
      action: 'done'
    }
  ];

  function render(container) {
    currentStep = 0;
    renderAll(container);
  }

  function renderAll(container) {
    const step = testSteps[currentStep];
    const progress = Math.round(((currentStep) / (testSteps.length - 1)) * 100);

    const html = `
      <div class="info-panel" style="background:#ecfdf5;border-color:#a7f3d0">
        <div class="info-panel-title" style="color:#065f46">🤝 交接测试模式</div>
        <ul>
          <li>以"接手同事"视角，按照产品财务小周的普通交接方式模拟完整流程</li>
          <li>测试目标：从银行流水找到原始说法，也能从截图说明讲清处理结果</li>
          <li>每一步点击下方按钮进入对应页面，完成后点"下一步"继续</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">
          交接进度
          <span class="badge">${currentStep + 1} / ${testSteps.length}</span>
        </div>
        <div style="background:#e5e7eb;height:8px;border-radius:4px;margin-bottom:8px">
          <div style="background:#10b981;height:8px;border-radius:4px;width:${progress}%;transition:width .3s"></div>
        </div>
        <div class="handover-guide">
          ${testSteps.map((s, i) => `
            <div class="handover-step" style="${i < currentStep ? 'opacity:.55;' : ''} ${i === currentStep ? 'border-left-color:#10b981;background:#ecfdf5;' : ''}">
              <div class="handover-step-num">${s.id}</div>
              <span class="handover-step-title">${i < currentStep ? '✅ ' : ''}${s.title.replace(/^第.步：/, '')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          当前步骤：${step.title}
        </div>
        <div style="background:#f9fafb;padding:16px;border-radius:6px;margin-bottom:16px;font-size:14px;line-height:1.8">
          ${step.desc}
        </div>
        <div class="btn-group" style="flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <button class="btn btn-primary" data-action="execute-step" data-step="${step.id}">👉 执行此步操作</button>
          <button class="btn" data-action="open-cheatsheet">📖 查看本步涉及的知识点</button>
        </div>
        <div id="cheatsheet" style="display:none;margin-top:12px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px">
          ${renderCheatsheet(step.id)}
        </div>
        <div class="section-divider"></div>
        <div class="btn-group" style="justify-content:space-between">
          <div>
            <button class="btn" data-action="prev" ${currentStep === 0 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>← 上一步</button>
            <button class="btn btn-primary" data-action="next" ${currentStep === testSteps.length - 1 ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>下一步 →</button>
          </div>
          <button class="btn btn-warning" data-action="reset">🔄 从头开始</button>
        </div>
      </div>
    `;
    container.innerHTML = html;
    bindEvents(container);
  }

  function renderCheatsheet(stepId) {
    const data = {
      1: `<strong>同源数据：</strong>筛选条件、统计卡片、明细表、截图说明都来自同一套 filterData() 结果，确保截图给领导看的数字和明细表对得上。<br>
           <strong>月底异常：</strong>"已调整"状态表示该笔记录因银行补录备注或人工修改，原"预付款"归属已变化，需要重点抽查。`,
      2: `<strong>汇总→明细联动：</strong>点击统计卡片会调用 applySubFilter() 对当前结果做二次筛选，明细只显示该状态的记录。<br>
           <strong>追溯变化入口：</strong>明细行的"追溯变化"按钮汇总了该笔审批的所有变更（判断修改+审批人改名+银行补录），用时间线呈现。`,
      3: `<strong>双向追溯：</strong>从银行流水能找到对应审批，从审批能找到对应银行流水。tx_005 对应 ap_005，关联关系存储在 approval.transactionId 字段。<br>
           <strong>原始说法：</strong>银行流水的"摘要"是银行原始记录，"备注"是系统内可补录的字段，两者分开存储以保留原始凭证。`,
      4: `<strong>补录留痕：</strong>调用 updateTransactionRemark() 时，除了更新 remark 字段，还会 push 一条 remarkHistory 记录和一条 auditLog。<br>
           <strong>影响范围自动生成：</strong>remarkHistory.impactScope 记录此变更会影响哪些模块，下次接手同事无需重新分析影响。`,
      5: `<strong>截图说明三要素：</strong>①截图描述（是什么图）、②处理结果（基于图得出的结论）、③上传人/时间（谁在什么时候做的判断）。<br>
           <strong>截图↔处理结果绑定：</strong>处理结果文字直接写在截图元数据中，避免"截图是这个，但最终处理结论没留痕"的问题。`,
      6: `<strong>历史版本不覆盖：</strong>judgmentHistory 数组存储所有版本，新 judgment 只是追加，不会覆盖旧值。时间线用颜色区分：初始=蓝、修改=黄、当前版本=绿。<br>
           <strong>下一班视角：</strong>不仅看到最终结果"已调整"，还能看到变更前的判断、谁改的、为什么改、改了之后影响什么。`,
      7: `<strong>审批人改名留痕三要素：</strong>①原审批人→新审批人、②变更原因、③来源行（原始凭证编号）。<br>
           <strong>来源行：</strong>对应需求中的"审批人改名以前靠人眼扫，至少要把影响范围和来源行留下"——sourceLine 字段就是来源依据。`,
      8: `<strong>同源核心机制：</strong>SummaryView.applyFilters() 只执行一次 DataStore.filterData()，其结果同时用于 computeSummary() 和 renderRows()，天然保持一致。<br>
           <strong>传统手工核对问题：</strong>以前可能先在Excel算数字、再在另一个系统截明细图，两套数据可能对不上。现在同一数据源零差异。`,
      9: `<strong>验收通过标准：</strong><br>
           1. 能从汇总→异常→追溯→银行流水，找到原始凭证说法 ✅<br>
           2. 能从截图说明文字，讲清最终处理结果是怎么定的 ✅<br>
           3. 能看到小周所有临时修改的历史版本，而非只看到最终结果 ✅<br>
           4. 筛选条件变了，统计和明细同步变，截图可直接导出 ✅`
    };
    return data[stepId] || '—';
  }

  function bindEvents(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;

      if (a === 'prev' && currentStep > 0) {
        currentStep--;
        renderAll(container);
      }
      if (a === 'next' && currentStep < testSteps.length - 1) {
        currentStep++;
        renderAll(container);
      }
      if (a === 'reset') {
        currentStep = 0;
        renderAll(container);
        Utils.showToast('已回到第一步', 'info');
      }
      if (a === 'open-cheatsheet') {
        const el = document.getElementById('cheatsheet');
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
      }
      if (a === 'execute-step') {
        const stepId = parseInt(btn.dataset.step, 10);
        executeStep(stepId, container);
      }
    });
  }

  function executeStep(stepId, container) {
    switch (stepId) {
      case 1:
        App.switchView('summary');
        setTimeout(() => {
          SummaryView.render(document.getElementById('view-summary'));
          setTimeout(() => {
            const modifiedCard = document.querySelector('.stat-card[data-filter="modified"]');
            if (modifiedCard) {
              modifiedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              modifiedCard.style.boxShadow = '0 0 0 4px #fecaca';
              setTimeout(() => modifiedCard.style.boxShadow = '', 2500);
            }
            Utils.showToast('已定位到"已调整"统计卡片，请点击它查看异常明细', 'info', 3500);
          }, 300);
        }, 100);
        break;
      case 2:
        App.switchView('summary');
        setTimeout(() => {
          SummaryView.render(document.getElementById('view-summary'));
          setTimeout(() => {
            const modifiedCard = document.querySelector('.stat-card[data-filter="modified"]');
            if (modifiedCard) modifiedCard.click();
            setTimeout(() => {
              const row = document.querySelector('tr[data-ap-id="ap_005"]');
              if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.style.background = '#fef9c3';
                setTimeout(() => row.style.background = '', 2500);
              }
              Utils.showToast('已联动筛选并定位到 ap_005，请点击"追溯变化"按钮', 'info', 3500);
            }, 300);
          }, 300);
        }, 100);
        break;
      case 3:
        App.switchView('summary');
        setTimeout(() => {
          SummaryView.render(document.getElementById('view-summary'));
          setTimeout(() => {
            const traceBtn = document.querySelector('tr[data-ap-id="ap_005"] button[data-action="trace"]');
            if (traceBtn) traceBtn.click();
            Utils.showToast('已打开追溯变化弹窗，请滚动到底部查看银行流水区域并点击"查看银行流水"', 'info', 4000);
          }, 300);
        }, 100);
        break;
      case 4:
        App.switchView('transactions');
        setTimeout(() => {
          TransactionsView.render(document.getElementById('view-transactions'));
          setTimeout(() => {
            const row = document.querySelector('tr');
            const btns = document.querySelectorAll('button[data-action="detail"]');
            btns.forEach(b => {
              if (b.dataset.id === 'tx_005') {
                b.click();
                Utils.showToast('已打开 tx_005 详情，请查看"备注历史"和"变更审计"中的影响范围', 'info', 4000);
              }
            });
          }, 300);
        }, 100);
        break;
      case 5:
        Utils.closeModal();
        App.switchView('approvals', { highlight: 'ap_005' });
        setTimeout(() => {
          ApprovalsView.render(document.getElementById('view-approvals'), { highlight: 'ap_005' });
          setTimeout(() => {
            const btns = document.querySelectorAll('#view-approvals button[data-action="detail"]');
            btns.forEach(b => {
              if (b.dataset.id === 'ap_005') {
                b.click();
                Utils.showToast('已打开 ap_005 详情，请滚动到"截图说明"区域查看处理结果', 'info', 4000);
              }
            });
          }, 400);
        }, 100);
        break;
      case 6:
        Utils.closeModal();
        App.switchView('approvals', { highlight: 'ap_005' });
        setTimeout(() => {
          ApprovalsView.render(document.getElementById('view-approvals'), { highlight: 'ap_005' });
          setTimeout(() => {
            const btns = document.querySelectorAll('#view-approvals button[data-action="detail"]');
            btns.forEach(b => {
              if (b.dataset.id === 'ap_005') {
                b.click();
                Utils.showToast('已打开 ap_005 详情，请查看"判断历史（共 2 个版本）"时间线，对比版本1和版本2', 'info', 4500);
              }
            });
          }, 400);
        }, 100);
        break;
      case 7:
        Utils.closeModal();
        App.switchView('approvals', { highlight: 'ap_003' });
        setTimeout(() => {
          ApprovalsView.render(document.getElementById('view-approvals'), { highlight: 'ap_003' });
          setTimeout(() => {
            const btns = document.querySelectorAll('#view-approvals button[data-action="detail"]');
            btns.forEach(b => {
              if (b.dataset.id === 'ap_003') {
                b.click();
                Utils.showToast('已打开 ap_003 详情，请查看"审批人变更历史"中的来源行和影响范围', 'info', 4500);
              }
            });
          }, 400);
        }, 100);
        break;
      case 8:
        Utils.closeModal();
        App.switchView('summary');
        setTimeout(() => {
          SummaryView.render(document.getElementById('view-summary'));
          setTimeout(() => {
            const statusSel = document.getElementById('f-status');
            if (statusSel) {
              statusSel.scrollIntoView({ behavior: 'smooth', block: 'center' });
              statusSel.style.boxShadow = '0 0 0 4px #bfdbfe';
              setTimeout(() => statusSel.style.boxShadow = '', 2500);
            }
            Utils.showToast('请尝试将"审批状态"切换为"已通过"后点"应用筛选"，观察统计卡片和明细表同步变化', 'info', 5000);
          }, 300);
        }, 100);
        break;
      case 9:
        Utils.showToast('🎉 恭喜完成交接测试！所有核心场景已验证通过', 'success', 4000);
        break;
    }
  }

  return { render };
})();
