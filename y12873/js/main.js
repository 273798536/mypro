// 主入口：UI 绑定、场景联动、筛选、明细、时间轴、修正留痕、导入去重

import { createStore } from './data.js';
import { createScene } from './scene.js';

const store = createStore();

const $ = (id) => document.getElementById(id);

const toast = (msg, type = 'info', ms = 3200) => {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; el.style.transition = 'all .3s'; }, ms - 300);
  setTimeout(() => el.remove(), ms);
};

function riskLabel(r) { return { high: '高危', mid: '中危', low: '正常' }[r] || r; }
function statusLabel(s) { return { ok: '可用', hold: '暂缓', recollect: '待重采' }[s] || s; }
function reviewLabel(s) { return { pending: '待确认', approved: '已通过', none: '—' }[s] || s; }

function renderAlerts() {
  const list = $('alert-list');
  const filtered = store.getFilteredAlerts();
  $('alert-meta').textContent = `共 ${filtered.length} 条通报（已合并去重，同批次不重复展示）`;
  list.innerHTML = filtered.map(a => {
    const cage = store.getCageById(a.cageId);
    const dataBadge = Object.entries(a.dataStatus)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `<span class="alert-count">${statusLabel(k)} ${v}</span>`).join('');
    return `
      <div class="alert-item ${a.risk} ${store.state.selectedId === a.id ? 'active' : ''}" data-id="${a.id}">
        <span class="alert-level ${a.risk}"></span>
        <div class="alert-info">
          <div class="ai-title">${a.title} <span class="status-tag ${a.reviewState}" style="margin-left:6px">${reviewLabel(a.reviewState)}</span></div>
          <div class="ai-sub">${cage ? cage.name : ''} · 浮标 ${a.buoyIds.join('/')} · 首次导入 ${a.firstImport} · 更新 ${a.lastUpdated}</div>
        </div>
        <div>${dataBadge}</div>
        <div class="alert-actions">
          <span class="alert-count">已导入 ${a.importCount} 次</span>
          <button class="mini-btn" data-action="correct" data-id="${a.id}">修正</button>
          <button class="mini-btn" data-action="detail" data-id="${a.id}">详情</button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.alert-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.dataset.action) return;
      selectById(el.dataset.id);
    });
  });
  list.querySelectorAll('[data-action="detail"]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); selectById(el.dataset.id); });
  });
  list.querySelectorAll('[data-action="correct"]').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); openCorrectionForm(el.dataset.id); });
  });
}

function renderTimeline() {
  const tl = $('timeline');
  tl.innerHTML = store.timeline.map((t, i) => `
    <div class="tl-item ${i === 0 ? 'active' : ''}" data-idx="${i}" data-alert="${t.alertId || ''}">
      <div class="tl-date">${t.date}</div>
      <div class="tl-label">${t.label}</div>
      <div>${t.tags.map(tg => `<span class="tl-tag ${tg}">${({import:'导入',revise:'修正',approve:'通过',dup:'重复合并'})[tg]||tg}</span>`).join('')}</div>
    </div>
  `).join('');
  tl.querySelectorAll('.tl-item').forEach(el => {
    el.addEventListener('click', () => {
      tl.querySelectorAll('.tl-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      const aid = el.dataset.alert;
      if (aid) selectById(aid);
      const idx = parseInt(el.dataset.idx, 10);
      renderVersionCompare(idx);
    });
  });
  renderVersionCompare(0);
}

function renderVersionCompare(idx) {
  const ev = store.timeline[idx];
  const box = $('version-compare');
  if (!ev || !ev.alertId) {
    box.innerHTML = '<p class="vc-empty">选中含"修正/通过"标记的时间点查看前后变化</p>';
    return;
  }
  const alert = store.getAlertById(ev.alertId);
  if (!alert || !alert.auditTrail || alert.auditTrail.length < 2) {
    box.innerHTML = '<p class="vc-empty">该通报暂无可对比的版本差异</p>';
    return;
  }
  const last = alert.auditTrail[alert.auditTrail.length - 1];
  const rows = last.changes.map(c => `
    <div class="vc-row">
      <div><span style="color:var(--text-mute);font-size:10px">${c.field}</span><br><span class="vc-old">${c.from}</span></div>
      <span class="vc-arrow">→</span>
      <div><span style="color:var(--text-mute);font-size:10px">&nbsp;</span><br><span class="vc-new">${c.to}</span></div>
    </div>
  `).join('');
  box.innerHTML = `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px">
      <strong style="color:var(--text)">${alert.title}</strong><br>
      <span>${last.actor} · ${last.time}</span>
    </div>
    ${rows}
    <div style="margin-top:6px;font-size:10px;color:var(--text-dim);font-style:italic;padding:4px 6px;background:var(--bg-3);border-radius:4px">
      原因：${last.reason || '—'}
    </div>
  `;
}

function selectById(id) {
  store.state.selectedId = id;
  renderAlerts();
  renderDetail();
  scene.highlightById(id);
}

function renderDetail() {
  const title = $('detail-title');
  const statusWrap = $('detail-status');
  const body = $('detail-body');
  const id = store.state.selectedId;

  if (!id) {
    title.textContent = '选择一个网箱或浮标查看明细';
    statusWrap.innerHTML = '';
    body.innerHTML = '<p class="placeholder">点击 3D 场景中的网箱、浮标，或在下方通报列表中选择条目。</p>';
    return;
  }

  const alert = store.getAlertById(id);
  if (alert) return renderAlertDetail(alert);

  const cage = store.getCageById(id);
  if (cage) return renderCageDetail(cage);

  const buoy = store.getBuoyById(id);
  if (buoy) return renderBuoyDetail(buoy);

  const buoy2 = store.buoys.find(b => b.cageId === id) || store.cages.find(c => c.id === id);
  if (buoy2 && buoy2.kind) return renderBuoyDetail(buoy2);

  title.textContent = '未找到对象';
  statusWrap.innerHTML = '';
  body.innerHTML = '<p class="placeholder">没有匹配的数据。</p>';
}

function renderAlertDetail(a) {
  const cage = store.getCageById(a.cageId);
  $('detail-title').textContent = a.title;
  $('detail-status').innerHTML = `
    <span class="status-tag ${a.risk}">${riskLabel(a.risk)}</span>
    <span class="status-tag ${a.reviewState}">${reviewLabel(a.reviewState)}</span>
  `;
  const layers = ['shallow', 'mid', 'deep'].map(k => {
    const r = store.readings[`${a.cageId}-${k}`];
    const label = { shallow: '浅层', mid: '中层', deep: '深层' }[k];
    if (!r) return `<div class="detail-row"><span class="label">${label} DO</span><span class="value">—</span></div>`;
    return `
      <div class="detail-row"><span class="label">${label} 溶氧 DO</span><span class="value">${r.do ?? '—'} mg/L <span class="status-tag ${r.status}" style="margin-left:4px">${statusLabel(r.status)}</span></span></div>
      <div class="detail-row"><span class="label">${label} 水温</span><span class="value">${r.temp ?? '—'} °C</span></div>
      <div class="detail-row"><span class="label">${label} 盐度</span><span class="value">${r.salinity ?? '—'} PSU</span></div>
    `;
  }).join('');

  const corrRows = Object.entries(a.corrections).map(([f, c]) => `
    <div class="audit-entry">
      <div class="ae-header">
        <span>${c.by} · ${c.at} · 修正「${f}」</span>
        <span>${riskLabel(a.risk)}</span>
      </div>
      <div class="ae-body">
        <span class="ae-change" style="background:rgba(255,77,109,.15);color:var(--high)">${c.from}</span>
        →
        <span class="ae-change" style="background:rgba(41,255,159,.15);color:var(--low)">${c.to}</span>
        <div style="margin-top:4px;color:var(--text-dim);font-size:10px">原因：${c.reason}</div>
      </div>
    </div>
  `).join('');

  const auditRows = a.auditTrail.slice().reverse().map(e => `
    <div class="audit-entry">
      <div class="ae-header">
        <span>${e.actor} · ${e.time}</span>
        <span>${e.action}</span>
      </div>
      <div class="ae-body">
        ${e.changes.map(c => `
          <span class="ae-change" style="background:rgba(255,176,32,.15);color:var(--mid)">${c.field}: ${c.from} → ${c.to}</span>
        `).join('')}
        ${e.reason ? `<div style="margin-top:4px;color:var(--text-dim);font-size:10px">${e.reason}</div>` : ''}
      </div>
    </div>
  `).join('');

  $('detail-body').innerHTML = `
    <div style="margin-bottom:10px;color:var(--text-dim);font-size:12px">${a.summary}</div>
    <div class="detail-grid">
      <div class="detail-row"><span class="label">归属网箱</span><span class="value">${cage ? cage.name + '（' + cage.species + '）' : a.cageId}</span></div>
      <div class="detail-row"><span class="label">关联浮标</span><span class="value">${a.buoyIds.join(', ')}</span></div>
      <div class="detail-row"><span class="label">数据可用 / 暂缓 / 待重采</span><span class="value">${a.dataStatus.ok} / ${a.dataStatus.hold} / ${a.dataStatus.recollect}</span></div>
      <div class="detail-row"><span class="label">导入次数</span><span class="value">${a.importCount} 次（去重合并）</span></div>
      <div class="detail-row"><span class="label">首次导入</span><span class="value">${a.firstImport}</span></div>
      <div class="detail-row"><span class="label">最近更新</span><span class="value">${a.lastUpdated}</span></div>
      ${layers}
    </div>
    <div class="audit-trail">
      <h4>修正前后变化</h4>
      ${corrRows || '<p class="placeholder" style="font-size:11px">暂无人工修正记录</p>'}
    </div>
    <div class="audit-trail">
      <h4>完整审计链（倒序）</h4>
      ${auditRows}
    </div>
    <div style="margin-top:10px;display:flex;gap:6px">
      <button class="btn-pending" onclick="window.__openCorrection && window.__openCorrection('${a.id}')">✏️ 人工修正</button>
      ${a.reviewState === 'pending' ? `<button class="btn-approve" onclick="window.__quickApprove && window.__quickApprove('${a.id}')">✅ 审核通过</button>` : ''}
    </div>
  `;
}

function renderCageDetail(cage) {
  const alertsForCage = store.alerts.filter(a => a.cageId === cage.id);
  $('detail-title').textContent = cage.name;
  const topRisk = alertsForCage.reduce((m, a) => ({ high: 'high', mid: m === 'high' ? 'high' : 'mid', low: m })[a.risk] || m, 'low');
  $('detail-status').innerHTML = `<span class="status-tag ${topRisk}">${riskLabel(topRisk)}</span>`;
  const layers = ['shallow', 'mid', 'deep'].map(k => {
    const r = store.readings[`${cage.id}-${k}`];
    const label = { shallow: '浅层', mid: '中层', deep: '深层' }[k];
    if (!r) return '';
    return `
      <div class="detail-row"><span class="label">${label} DO</span><span class="value">${r.do ?? '—'} mg/L <span class="status-tag ${r.status}" style="margin-left:4px">${statusLabel(r.status)}</span></span></div>
      <div class="detail-row"><span class="label">${label} 水温</span><span class="value">${r.temp ?? '—'} °C</span></div>
    `;
  }).join('');
  $('detail-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-row"><span class="label">养殖品种</span><span class="value">${cage.species}</span></div>
      <div class="detail-row"><span class="label">尺寸</span><span class="value">${cage.width} × ${cage.depth} × ${cage.height} m</span></div>
      <div class="detail-row"><span class="label">坐标</span><span class="value">(${cage.x}, ${cage.z})</span></div>
      <div class="detail-row"><span class="label">关联通报</span><span class="value">${alertsForCage.length} 条</span></div>
      ${layers}
    </div>
    <div style="margin-top:10px;">
      ${alertsForCage.map(a => `<button class="mini-btn" style="margin-right:6px" onclick="window.__selectId && window.__selectId('${a.id}')">📋 ${a.title}</button>`).join('')}
    </div>
  `;
}

function renderBuoyDetail(buoy) {
  const cage = store.getCageById(buoy.cageId);
  $('detail-title').textContent = buoy.name;
  $('detail-status').innerHTML = `<span class="status-tag ok">在线</span>`;
  $('detail-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-row"><span class="label">归属网箱</span><span class="value">${cage ? cage.name : buoy.cageId}</span></div>
      <div class="detail-row"><span class="label">水面坐标</span><span class="value">(${buoy.x}, ${buoy.z})</span></div>
    </div>
    <div style="margin-top:10px;">
      <button class="mini-btn" onclick="window.__selectId && window.__selectId('${buoy.cageId}')">查看所属网箱</button>
    </div>
  `;
}

window.__selectId = selectById;
window.__openCorrection = openCorrectionForm;
window.__quickApprove = (id) => {
  const a = store.getAlertById(id);
  if (!a) return;
  const reason = prompt('请填写审核通过的原因（将留痕）：', '数据已复核，风险判断与现场一致。');
  if (reason === null) return;
  submitCorrection(id, 'reviewState', 'pending', 'approved', reason || '通过', '当前用户');
};

function openCorrectionForm(alertId) {
  selectById(alertId);
  const a = store.getAlertById(alertId);
  if (!a) return;
  setTimeout(() => {
    const existing = document.querySelector('.correct-form');
    if (existing) existing.remove();
    const form = document.createElement('div');
    form.className = 'correct-form';
    form.innerHTML = `
      <h4 style="font-size:11px;color:var(--text-dim);margin-bottom:8px">人工修正（所有修改将进入审计链并留痕）</h4>
      <label>修正字段</label>
      <select id="cf-field">
        <option value="risk">风险等级</option>
        <option value="reviewState">修正状态（审核）</option>
      </select>
      <div id="cf-values">
        <label>修改为</label>
        <select id="cf-to">
          <option value="high">高危</option>
          <option value="mid">中危</option>
          <option value="low">正常</option>
        </select>
      </div>
      <label>修正原因 <span style="color:var(--text-mute)">（必填，将对外可见）</span></label>
      <textarea id="cf-reason" placeholder="如：现场潜水复核；传感器漂移；数据补录等。"></textarea>
      <div class="btns">
        <button class="btn-pending" id="cf-save">保存为待确认</button>
        <button class="btn-approve" id="cf-approve">保存并通过</button>
        <button class="btn-cancel" id="cf-cancel">取消</button>
      </div>
    `;
    $('detail-body').appendChild(form);
    const fieldSel = $('cf-field');
    const toSel = $('cf-to');
    const renderToOptions = () => {
      if (fieldSel.value === 'risk') {
        toSel.innerHTML = '<option value="high">高危</option><option value="mid">中危</option><option value="low">正常</option>';
      } else {
        toSel.innerHTML = '<option value="pending">待确认</option><option value="approved">已通过</option>';
      }
    };
    fieldSel.addEventListener('change', renderToOptions);
    renderToOptions();

    $('cf-cancel').addEventListener('click', () => form.remove());
    const save = (alsoApprove) => {
      const field = fieldSel.value;
      const to = toSel.value;
      const from = field === 'risk' ? a.risk : a.reviewState;
      const reason = $('cf-reason').value.trim();
      if (!reason) { toast('请填写修正原因', 'warning'); return; }
      const actor = '当前用户';
      submitCorrection(alertId, field, from, to, reason, actor);
      if (alsoApprove && field !== 'reviewState') {
        submitCorrection(alertId, 'reviewState', a.reviewState, 'approved', '修正内容已复核通过。', actor);
      } else if (alsoApprove && field === 'reviewState' && to !== 'approved') {
        // noop
      } else if (alsoApprove) {
        // already covered
      }
      form.remove();
      toast(alsoApprove ? '已保存并通过，变更已留痕' : '已保存为待确认，等待审核', 'success');
    };
    $('cf-save').addEventListener('click', () => save(false));
    $('cf-approve').addEventListener('click', () => save(true));
  }, 50);
}

function submitCorrection(alertId, field, from, to, reason, actor) {
  store.submitCorrection(alertId, field, from, to, reason, actor);
  renderAlerts();
  renderDetail();
  renderTimeline();
}

function bindFilters() {
  const bindGroup = (groupId, stateKey) => {
    $(groupId).addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      $(groupId).querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      store.state.selectedFilter[stateKey] = btn.dataset[stateKey];
      renderAlerts();
    });
  };
  bindGroup('risk-filter', 'risk');
  bindGroup('data-filter', 'status');
  bindGroup('review-filter', 'review');

  const clip = $('clip-depth');
  const clipVal = $('clip-value');
  clip.addEventListener('input', () => {
    const pct = parseInt(clip.value, 10);
    store.state.clipDepth = pct;
    const m = ((pct / 100) * 25).toFixed(1);
    clipVal.textContent = `${m} m`;
    scene.setClipDepth(pct);
  });
}

function bindTopbar() {
  $('btn-rotate').addEventListener('click', (e) => {
    store.state.autoRotate = !store.state.autoRotate;
    e.currentTarget.classList.toggle('active', store.state.autoRotate);
  });
  $('btn-reset').addEventListener('click', () => {
    scene.resetView();
    toast('视角已重置', 'info', 1500);
  });
  $('btn-export').addEventListener('click', () => {
    const alerts = store.getFilteredAlerts();
    const text = alerts.map(a => `【${riskLabel(a.risk)}】${a.title}\n${a.summary}\n数据：可用${a.dataStatus.ok}/暂缓${a.dataStatus.hold}/待重采${a.dataStatus.recollect}\n修正状态：${reviewLabel(a.reviewState)}\n更新：${a.lastUpdated}\n`).join('\n---\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `风险通报_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`已导出 ${alerts.length} 条通报`, 'success');
  });
}

function bindNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const v = btn.dataset.view;
      if (v === 'map') {
        toast('地图联动：月底或课前模式启用；将叠加海流与历史高风险热区。（演示）', 'info', 3600);
      } else if (v === 'import') {
        simulateImport();
      } else if (v === 'audit') {
        toast('修正审计链：见明细面板"完整审计链"与左侧时间轴版本对比', 'info', 3000);
        selectById('AL-C1-HIGH');
      }
    });
  });
}

function simulateImport() {
  const fake = [
    {
      cageId: 'C1', risk: 'high',
      title: '1 号网箱底层溶氧严重不足',
      summary: '演示用：与已有通报同批次，应被合并而不是新建。',
      dataStatus: { ok: 2, hold: 0, recollect: 1 },
      buoyIds: ['B01', 'B02'],
    },
    {
      cageId: 'C4', risk: 'low',
      title: '4 号网箱溶氧状态良好（演示新增）',
      summary: '演示用：该批次为新增，应新建通报。',
      dataStatus: { ok: 3, hold: 0, recollect: 0 },
      buoyIds: ['B07', 'B08'],
    },
  ];
  const res = store.importBatch(fake, store.state.currentBatch);
  renderAlerts();
  renderTimeline();
  if (res.merged > 0) {
    toast(`导入完成：新建 ${res.created} 条，自动合并去重 ${res.merged} 条（${res.duplicates.join('、')}），未出现冲突结论`, 'success', 5000);
  } else {
    toast(`导入完成：新建 ${res.created} 条，合并 ${res.merged} 条`, 'success');
  }
}

// ====== 初始化 ======
const scene = createScene($('viewport'), store, {
  onSelect: (u) => {
    if (u.kind === 'cage') selectById(u.id);
    else if (u.kind === 'buoy') {
      store.state.selectedId = u.id;
      renderDetail();
      renderAlerts();
      scene.highlightById(u.id);
    }
  },
});

bindFilters();
bindTopbar();
bindNav();
renderAlerts();
renderTimeline();
renderDetail();

setTimeout(() => {
  toast('日常入口：历史回看已就绪。点击左侧筛选、时间轴，或 3D 场景里的网箱/浮标开始。', 'info', 4200);
}, 400);
