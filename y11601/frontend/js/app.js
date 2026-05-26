const API = '/api';

function fetchJson(url, options = {}) {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  }).then(r => {
    if (!r.ok) {
      return r.json().then(err => { throw new Error(err.error || '请求失败'); });
    }
    return r.json();
  });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function showModal(title, html, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').style.display = 'flex';

  const form = document.getElementById('modalForm');
  if (form && onSubmit) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = {};
      formData.forEach((v, k) => { data[k] = v; });
      onSubmit(data);
    });
  }
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

function riskBadge(level) {
  const map = {
    SAFE: 'badge-safe',
    WARNING: 'badge-warning',
    DANGER: 'badge-danger',
    CRITICAL: 'badge-critical'
  };
  const label = { SAFE: '安全', WARNING: '警戒', DANGER: '危险', CRITICAL: '紧急' };
  return `<span class="badge ${map[level] || 'badge-muted'}">${label[level] || level}</span>`;
}

function typeTag(type) {
  return `<span class="tag ${type === 'CALL' ? 'tag-call' : 'tag-put'}">${type}</span>`;
}

function dirTag(dir) {
  return `<span class="tag ${dir === 'LONG' ? 'tag-long' : 'tag-short'}">${dir === 'LONG' ? '多' : '空'}</span>`;
}

function fmtNum(n, digits = 0) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  return (n * 100).toFixed(2) + '%';
}

async function loadDashboard() {
  try {
    const margins = await fetchJson(`${API}/margin/current`);
    const stats = { SAFE: 0, WARNING: 0, DANGER: 0, CRITICAL: 0, JUMP: 0, DUP: 0 };

    margins.forEach(m => {
      if (stats[m.risk_level] !== undefined) stats[m.risk_level]++;
      if (m.iv_jump_detected) stats.JUMP++;
      if (m.combo_offset_applied) stats.DUP++;
    });

    document.getElementById('stat-safe').textContent = stats.SAFE;
    document.getElementById('stat-warning').textContent = stats.WARNING;
    document.getElementById('stat-danger').textContent = stats.DANGER;
    document.getElementById('stat-critical').textContent = stats.CRITICAL;
    document.getElementById('stat-jump').textContent = stats.JUMP;
    document.getElementById('stat-dup').textContent = stats.DUP;

    const alerts = [];
    margins.forEach(m => {
      if (m.iv_jump_detected) {
        alerts.push({ type: 'warning', msg: `⚠ IV跳变: ${m.contract_code} 变化${fmtPct(m.iv_jump_pct)}` });
      }
    });

    const notifs = await fetchJson(`${API}/notifications?status=PENDING`);
    notifs.forEach(n => {
      if (n.is_duplicate) {
        alerts.push({ type: 'info', msg: `↻ 重复通知: ${n.account} / ${n.contract_code} (已拦截)` });
      }
    });

    const banner = document.getElementById('alertBanner');
    if (alerts.length > 0) {
      banner.innerHTML = alerts.map(a => `<span class="alert-${a.type}">${a.msg}</span>`).join(' | ');
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }

    const tbody = document.querySelector('#overviewTable tbody');
    tbody.innerHTML = margins.map(m => {
      const flags = [];
      if (m.iv_jump_detected) flags.push('<span class="badge badge-jump">IV跳变</span>');
      if (m.combo_offset_applied) flags.push('<span class="badge badge-info">组合抵扣</span>');
      return `
        <tr>
          <td>${m.account}</td>
          <td>${m.contract_code}</td>
          <td>${dirTag(m.direction)}</td>
          <td>¥${fmtNum(m.required_margin, 2)}</td>
          <td>¥${fmtNum(m.available_margin, 0)}</td>
          <td>${m.margin_ratio.toFixed(2)}x</td>
          <td>${riskBadge(m.risk_level)}</td>
          <td>${flags.join(' ') || '-'}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadMarginTab() {
  try {
    const margins = await fetchJson(`${API}/margin/current`);
    const search = document.getElementById('marginSearch').value.toLowerCase();

    const filtered = search ? margins.filter(m => m.account.toLowerCase().includes(search)) : margins;

    const tbody = document.querySelector('#marginTable tbody');
    tbody.innerHTML = filtered.map(m => `
      <tr>
        <td>${m.account}</td>
        <td>${m.contract_code}</td>
        <td>${m.underlying}</td>
        <td>${typeTag(m.option_type)}</td>
        <td>${dirTag(m.direction)}</td>
        <td>${m.quantity}</td>
        <td>¥${fmtNum(m.required_margin, 2)}</td>
        <td>¥${fmtNum(m.available_margin, 0)}</td>
        <td>${m.margin_ratio.toFixed(2)}x</td>
        <td>${riskBadge(m.risk_level)}</td>
        <td>${m.iv_jump_detected ? fmtPct(m.iv_jump_pct) : '-'}</td>
        <td>${m.combo_offset_applied ? '¥' + fmtNum(m.combo_offset_amount, 2) : '-'}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadNotificationsTab() {
  try {
    const filter = document.getElementById('notifFilter').value;
    const url = filter ? `${API}/notifications?status=${filter}` : `${API}/notifications`;
    const notifs = await fetchJson(url);

    const statusLabels = {
      PENDING: '待发送', SENT: '已发送', ACKNOWLEDGED: '已确认',
      RESOLVED: '已解决', CANCELLED: '已取消'
    };

    const tbody = document.querySelector('#notifTable tbody');
    tbody.innerHTML = notifs.map(n => {
      const statusBadge = `<span class="badge ${
        n.status === 'PENDING' ? 'badge-warning' :
        n.status === 'SENT' ? 'badge-info' :
        n.status === 'ACKNOWLEDGED' ? 'badge-safe' :
        n.status === 'RESOLVED' ? 'badge-muted' : 'badge-muted'
      }">${statusLabels[n.status]}</span>`;

      let actions = '';
      if (n.status === 'PENDING' && !n.is_duplicate) {
        actions = `<button class="btn-action primary" onclick="sendNotif(${n.id})">发送</button>`;
      } else if (n.status === 'SENT') {
        actions = `<button class="btn-action" onclick="ackNotif(${n.id})">确认</button>`;
      } else if (n.status === 'ACKNOWLEDGED') {
        actions = `<button class="btn-action primary" onclick="resolveNotif(${n.id})">解决</button>`;
      }

      return `
        <tr class="${n.is_duplicate ? 'opacity-50' : ''}">
          <td>#${n.id}</td>
          <td>${n.account}</td>
          <td>${n.contract_code}</td>
          <td>¥${fmtNum(n.shortfall, 2)}</td>
          <td>${statusBadge}</td>
          <td>${n.is_duplicate ? '<span class="badge badge-dup">重复</span>' : '-'}</td>
          <td>${n.note || '-'}</td>
          <td>${actions}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadPositionsTab() {
  try {
    const positions = await fetchJson(`${API}/positions`);
    const tbody = document.querySelector('#posTable tbody');
    tbody.innerHTML = positions.map(p => `
      <tr>
        <td>#${p.id}</td>
        <td>${p.account}</td>
        <td>${p.contract_code}</td>
        <td>${dirTag(p.direction)}</td>
        <td>${p.quantity}</td>
        <td>¥${fmtNum(p.open_price, 2)}</td>
        <td>${p.source || '-'}</td>
        <td>${p.note || '-'}</td>
        <td><button class="btn-action" onclick="deletePos(${p.id})">删除</button></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadContractsTab() {
  try {
    const contracts = await fetchJson(`${API}/contracts`);
    const tbody = document.querySelector('#contractTable tbody');
    const results = await Promise.all(contracts.map(async c => {
      const valid = await fetchJson(`${API}/validate/${c.code}`);
      return { ...c, valid };
    }));
    tbody.innerHTML = results.map(c => `
      <tr>
        <td>${c.code}</td>
        <td>${c.underlying}</td>
        <td>${typeTag(c.option_type)}</td>
        <td>¥${fmtNum(c.strike, 0)}</td>
        <td>${c.expiry_date}</td>
        <td>${c.multiplier}</td>
        <td>${c.valid.valid ? '<span class="badge badge-safe">正常</span>' :
            `<span class="badge badge-danger">${c.valid.errors.join(', ')}</span>`}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadQuotesTab() {
  try {
    const quotes = await fetchJson(`${API}/quotes`);
    const tbody = document.querySelector('#quoteTable tbody');
    tbody.innerHTML = quotes.map(q => `
      <tr>
        <td>${q.contract_code}</td>
        <td>¥${fmtNum(q.price, 2)}</td>
        <td>${(q.iv * 100).toFixed(1)}%</td>
        <td>${q.delta.toFixed(3)}</td>
        <td>${q.gamma.toFixed(4)}</td>
        <td>${q.vega.toFixed(2)}</td>
        <td>${q.theta.toFixed(2)}</td>
        <td>¥${fmtNum(q.spot_price, 0)}</td>
        <td>${q.timestamp}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

async function loadAuditTab() {
  try {
    const logs = await fetchJson(`${API}/audit`);
    const tbody = document.querySelector('#auditTable tbody');
    tbody.innerHTML = logs.map(l => `
      <tr>
        <td>${l.created_at}</td>
        <td>${l.entity_type}</td>
        <td>${l.action}</td>
        <td>${l.operator}</td>
        <td><button class="btn-action" onclick="showAuditDetail(${l.id})">查看</button></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}

function showAuditDetail(id) {
  fetchJson(`${API}/audit`).then(logs => {
    const log = logs.find(l => l.id === id);
    if (log) {
      showModal('审计详情', `
        <div style="font-size: 13px; line-height: 1.8;">
          <p><strong>类型:</strong> ${log.entity_type}</p>
          <p><strong>ID:</strong> ${log.entity_id || '-'}</p>
          <p><strong>动作:</strong> ${log.action}</p>
          <p><strong>操作人:</strong> ${log.operator}</p>
          <p><strong>时间:</strong> ${log.created_at}</p>
          ${log.before_data && log.before_data !== 'null' ? `<p><strong>变更前:</strong></p><pre style="background:#0f172a;padding:8px;border-radius:4px;margin-top:4px;">${log.before_data}</pre>` : ''}
          ${log.after_data && log.after_data !== 'null' ? `<p><strong>变更后:</strong></p><pre style="background:#0f172a;padding:8px;border-radius:4px;margin-top:4px;">${log.after_data}</pre>` : ''}
        </div>
      `);
    }
  });
}

function showAddPosition() {
  showModal('新增持仓', `
    <form id="modalForm">
      <div class="form-group">
        <label>账户号</label>
        <input type="text" name="account" required>
      </div>
      <div class="form-group">
        <label>合约代码</label>
        <input type="text" name="contract_code" required>
      </div>
      <div class="form-group">
        <label>方向</label>
        <select name="direction" required>
          <option value="LONG">做多</option>
          <option value="SHORT">做空</option>
        </select>
      </div>
      <div class="form-group">
        <label>数量</label>
        <input type="number" name="quantity" required min="1">
      </div>
      <div class="form-group">
        <label>开仓价</label>
        <input type="number" name="open_price" required step="0.01" min="0">
      </div>
      <div class="form-group">
        <label>备注</label>
        <input type="text" name="note">
      </div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="closeModal()">取消</button>
        <button type="submit" class="btn btn-primary">创建</button>
      </div>
    </form>
  `, async (data) => {
    try {
      data.quantity = parseInt(data.quantity);
      data.open_price = parseFloat(data.open_price);
      await fetchJson(`${API}/positions`, { method: 'POST', body: JSON.stringify(data) });
      showToast('持仓已创建', 'success');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

function showAddContract() {
  showModal('新增合约', `
    <form id="modalForm">
      <div class="form-group">
        <label>合约代码</label>
        <input type="text" name="code" required>
      </div>
      <div class="form-group">
        <label>标的</label>
        <input type="text" name="underlying" required>
      </div>
      <div class="form-group">
        <label>类型</label>
        <select name="option_type" required>
          <option value="CALL">看涨</option>
          <option value="PUT">看跌</option>
        </select>
      </div>
      <div class="form-group">
        <label>行权价</label>
        <input type="number" name="strike" required step="0.01" min="0">
      </div>
      <div class="form-group">
        <label>到期日</label>
        <input type="date" name="expiry_date" required>
      </div>
      <div class="form-group">
        <label>乘数</label>
        <input type="number" name="multiplier" value="10000" step="100">
      </div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="closeModal()">取消</button>
        <button type="submit" class="btn btn-primary">创建</button>
      </div>
    </form>
  `, async (data) => {
    try {
      data.strike = parseFloat(data.strike);
      data.multiplier = parseFloat(data.multiplier);
      await fetchJson(`${API}/contracts`, { method: 'POST', body: JSON.stringify(data) });
      showToast('合约已创建', 'success');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

function showAddQuote() {
  showModal('录入行情', `
    <form id="modalForm">
      <div class="form-group">
        <label>合约代码</label>
        <input type="text" name="contract_code" required>
      </div>
      <div class="form-group">
        <label>期权价格</label>
        <input type="number" name="price" required step="0.01" min="0">
      </div>
      <div class="form-group">
        <label>隐含波动率(小数)</label>
        <input type="number" name="iv" required step="0.01" min="0" value="0.25">
      </div>
      <div class="form-group">
        <label>Delta</label>
        <input type="number" name="delta" required step="0.001" value="0.5">
      </div>
      <div class="form-group">
        <label>Gamma</label>
        <input type="number" name="gamma" required step="0.001" value="0.003">
      </div>
      <div class="form-group">
        <label>Vega</label>
        <input type="number" name="vega" required step="0.01" value="8">
      </div>
      <div class="form-group">
        <label>Theta</label>
        <input type="number" name="theta" required step="0.01" value="-2">
      </div>
      <div class="form-group">
        <label>现货价格</label>
        <input type="number" name="spot_price" required step="0.01" min="0">
      </div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="closeModal()">取消</button>
        <button type="submit" class="btn btn-primary">录入</button>
      </div>
    </form>
  `, async (data) => {
    try {
      data.price = parseFloat(data.price);
      data.iv = parseFloat(data.iv);
      data.delta = parseFloat(data.delta);
      data.gamma = parseFloat(data.gamma);
      data.vega = parseFloat(data.vega);
      data.theta = parseFloat(data.theta);
      data.spot_price = parseFloat(data.spot_price);
      await fetchJson(`${API}/quotes`, { method: 'POST', body: JSON.stringify(data) });
      showToast('行情已录入', 'success');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

async function sendNotif(id) {
  try {
    await fetchJson(`${API}/notifications/${id}/send`, { method: 'POST', body: JSON.stringify({ channel: 'SYSTEM' }) });
    showToast('通知已发送', 'success');
    loadNotificationsTab();
    loadDashboard();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function ackNotif(id) {
  try {
    await fetchJson(`${API}/notifications/${id}/acknowledge`, { method: 'POST' });
    showToast('客户已确认', 'success');
    loadNotificationsTab();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function resolveNotif(id) {
  showModal('解决通知', `
    <form id="modalForm">
      <div class="form-group">
        <label>备注</label>
        <textarea name="note" rows="3" placeholder="说明处理方式..."></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn" onclick="closeModal()">取消</button>
        <button type="submit" class="btn btn-primary">标记已解决</button>
      </div>
    </form>
  `, async (data) => {
    try {
      await fetchJson(`${API}/notifications/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) });
      showToast('通知已解决', 'success');
      closeModal();
      loadNotificationsTab();
      loadDashboard();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

async function deletePos(id) {
  if (!confirm('确定要删除这条持仓吗？')) return;
  try {
    await fetchJson(`${API}/positions/${id}`, { method: 'DELETE' });
    showToast('持仓已删除', 'success');
    loadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function recalcMargin() {
  try {
    showToast('正在重算...', 'info');
    const result = await fetchJson(`${API}/margin/recalculate`, { method: 'POST' });
    showToast(`保证金已重算，共 ${result.count} 条`, 'success');
    await fetchJson(`${API}/notifications/generate`, { method: 'POST' });
    loadAll();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function exportCSV() {
  window.location.href = `${API}/reports/export/csv`;
}

async function genNotifs() {
  try {
    const result = await fetchJson(`${API}/notifications/generate`, { method: 'POST' });
    showToast(`已生成 ${result.count} 条通知`, 'success');
    loadNotificationsTab();
    loadDashboard();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function loadAll() {
  loadDashboard();
  loadMarginTab();
  loadNotificationsTab();
  loadPositionsTab();
  loadContractsTab();
  loadQuotesTab();
  loadAuditTab();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  document.getElementById('recalcBtn').addEventListener('click', recalcMargin);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('addPosBtn').addEventListener('click', showAddPosition);
  document.getElementById('addContractBtn').addEventListener('click', showAddContract);
  document.getElementById('addQuoteBtn').addEventListener('click', showAddQuote);
  document.getElementById('genNotifBtn').addEventListener('click', genNotifs);
  document.getElementById('notifFilter').addEventListener('change', loadNotificationsTab);
  document.getElementById('marginSearch').addEventListener('input', loadMarginTab);

  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });

  loadAll();
});
