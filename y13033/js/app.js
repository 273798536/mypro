const App = (function () {
  let currentView = 'summary';

  const viewMap = {
    summary: { container: 'view-summary', module: SummaryView, label: '汇总统计' },
    transactions: { container: 'view-transactions', module: TransactionsView, label: '银行流水' },
    approvals: { container: 'view-approvals', module: ApprovalsView, label: '审批记录' },
    audit: { container: 'view-audit', module: AuditView, label: '变更审计' },
    handover: { container: 'view-handover', module: HandoverView, label: '交接测试' }
  };

  function init() {
    updateDateDisplay();
    Utils.initModalClose();
    bindNav();
    renderView('summary');
  }

  function updateDateDisplay() {
    const el = document.getElementById('currentDate');
    if (el) {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      el.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  }

  function bindNav() {
    const nav = document.querySelector('.app-nav');
    if (!nav) return;
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-btn');
      if (!btn) return;
      const view = btn.dataset.view;
      if (view) switchView(view);
    });
  }

  function switchView(view, options) {
    const entry = viewMap[view];
    if (!entry) return;
    currentView = view;

    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const container = document.getElementById(entry.container);
    if (container) container.classList.add('active');

    renderView(view, options);
  }

  function renderView(view, options) {
    const entry = viewMap[view];
    if (!entry || !entry.module) return;
    const container = document.getElementById(entry.container);
    if (container && entry.module && typeof entry.module.render === 'function') {
      entry.module.render(container, options);
    }
  }

  function getCurrentView() {
    return currentView;
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    switchView,
    getCurrentView,
    renderView
  };
})();
