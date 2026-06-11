const Utils = (function () {
  let _activeModalHandler = null;

  function showToast(message, type = 'info', duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => {
      toast.className = 'toast hidden';
    }, duration);
  }

  function showModal(htmlContent) {
    unbindModalClick();
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    if (modal && content) {
      content.innerHTML = htmlContent;
      modal.classList.remove('hidden');
    }
  }

  function closeModal() {
    unbindModalClick();
    const modal = document.getElementById('modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function bindModalClick(handler) {
    unbindModalClick();
    const content = document.getElementById('modalContent');
    if (content) {
      _activeModalHandler = handler;
      content.addEventListener('click', _activeModalHandler);
    }
  }

  function unbindModalClick() {
    if (_activeModalHandler) {
      const content = document.getElementById('modalContent');
      if (content) content.removeEventListener('click', _activeModalHandler);
      _activeModalHandler = null;
    }
  }

  function initModalClose() {
    const modal = document.getElementById('modal');
    if (modal) {
      modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn')) closeModal();
      });
    }
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function statusLabel(status) {
    const map = {
      pending: { text: '待审批', cls: 'status-pending' },
      approved: { text: '已通过', cls: 'status-approved' },
      rejected: { text: '已拒绝', cls: 'status-rejected' },
      modified: { text: '已调整', cls: 'status-modified' },
      supplement: { text: '已补录', cls: 'status-supplement' }
    };
    const m = map[status] || { text: status, cls: '' };
    return `<span class="status-tag ${m.cls}">${m.text}</span>`;
  }

  function isChangedApproval(ap) {
    return (ap.judgmentHistory && ap.judgmentHistory.length > 1)
      || (ap.approverHistory && ap.approverHistory.length > 0);
  }

  function getTodayStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function getMonthRange() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const to = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from, to };
  }

  return {
    showToast,
    showModal,
    closeModal,
    bindModalClick,
    unbindModalClick,
    initModalClose,
    escapeHtml,
    statusLabel,
    isChangedApproval,
    getTodayStr,
    getMonthRange
  };
})();
