// ============================================================
// 点位详情面板
// ============================================================

const Detail = (() => {
  function init() {
    renderMaterials();
  }

  function currentDataset() {
    return DATASETS[STATE.currentDatasetId];
  }

  function clear() {
    const panel = document.getElementById('detailPanel');
    panel.innerHTML = `<div class="text-sm text-slate-400 italic">暂未选择点位</div>`;
  }

  function renderPoint(p) {
    const panel = document.getElementById('detailPanel');
    const ds = currentDataset();
    const color = CAD.pointColor(p);
    const statusText = p.status === 'anomaly' ? '异常' : p.status === 'delay' ? '延迟' : '正常';

    let html = '';

    html += `<div class="detail-section-title">基本信息</div>`;
    html += `
      <div class="bg-slate-900/60 border border-slate-700 rounded-lg p-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-lg font-bold" style="color:${color}">${p.id}</span>
          <span class="text-xs px-2 py-0.5 rounded" style="background:${color}22;color:${color};border:1px solid ${color}55">${statusText}${p.delaySec > 0 ? ` +${p.delaySec}s` : ''}</span>
        </div>
        <div class="text-sm text-slate-200 font-medium">${p.label}</div>
        <div class="grid grid-cols-2 gap-2 text-xs mt-2">
          <div><div class="text-slate-500">计划时间</div><div class="text-slate-200 font-mono">${fmtTime(p.plannedTime)}</div></div>
          <div><div class="text-slate-500">实际时间</div><div class="text-slate-200 font-mono">${fmtTime(p.actualTime)}</div></div>
          <div><div class="text-slate-500">点位类型</div><div class="text-slate-200">${typeLabel(p.code)}</div></div>
          <div><div class="text-slate-500">坐标</div><div class="text-slate-200 font-mono">(${p.x}, ${p.y})</div></div>
        </div>
        ${p.confirmed ? `
          <div class="mt-2 pt-2 border-t border-slate-700 text-xs text-emerald-300">
            ✓ 已确认 · ${p.confirmedBy} · ${p.confirmedAt}
          </div>
        ` : p.status !== 'ok' ? `
          <div class="mt-2 pt-2 border-t border-slate-700 text-xs text-amber-300">
            ⚠ 待人工确认
          </div>
        ` : ''}
      </div>
    `;

    if (p.anomaly) {
      html += `<div class="detail-section-title">
        <svg class="w-3.5 h-3.5 text-rose-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19H3.5L12 5.5zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z"/></svg>
        异常信息 · ${p.anomaly.code}
      </div>`;
      html += `
        <div class="anomaly-banner">
          <div class="text-xs text-rose-300 font-semibold mb-1">${p.anomaly.type}</div>
          <div class="text-xs text-slate-200 leading-relaxed">${p.anomaly.description}</div>
          <div class="mt-2 text-xs">
            <span class="text-slate-400">根因分析：</span>
            <span class="text-amber-300">${p.anomaly.rootCause}</span>
          </div>
        </div>
      `;
    }

    if (p.trace && p.trace.length) {
      html += `<div class="detail-section-title">
        <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        追溯链条 · ${p.trace.length} 步
      </div>`;
      html += `<div class="space-y-0">`;
      p.trace.forEach(step => {
        html += `
          <div class="trace-chain-item">
            <div class="text-xs text-slate-200 font-medium">${step.desc}</div>
            <div class="mt-1 flex flex-wrap gap-1.5">
              ${step.source ? `<span class="material-tag bg-cyan-900/30 text-cyan-300 border-cyan-700/50">来源：${step.source}</span>` : ''}
              ${step.time ? `<span class="material-tag bg-slate-700 text-slate-300 border-slate-600">${step.time}</span>` : ''}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    const layerRef = CAD_LAYERS.find(l => l.id === p.cadLayerRef);
    if (layerRef) {
      html += `<div class="detail-section-title">
        <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
        CAD 图层原始说法
      </div>`;
      html += `
        <div class="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3">
          <div class="text-xs text-blue-300 font-semibold mb-1">${layerRef.name}</div>
          <div class="text-xs text-slate-200 leading-relaxed">${layerRef.originalNote}</div>
        </div>
      `;
    }

    if (p.materials && p.materials.length) {
      html += `<div class="detail-section-title">
        <svg class="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
        关联材料 · ${p.materials.length} 份
      </div>`;
      p.materials.forEach(mid => {
        const m = MATERIALS.find(x => x.id === mid);
        if (!m) return;
        const typeIcon = m.type === 'cad' ? '📐' : m.type === 'attachment' ? '📎' : '💬';
        html += `
          <div class="bg-slate-900/60 border ${m.modified ? 'border-amber-600/50' : 'border-slate-700'} rounded-lg p-3 mb-2 cursor-pointer hover:border-slate-500 transition-colors" onclick="Detail.showMaterial('${m.id}')">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-1.5">
                <span>${typeIcon}</span>
                <span class="text-xs text-slate-200 font-medium">${m.name}</span>
              </div>
              ${m.modified ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">口径已改 v${m.versions.length}</span>` : ''}
            </div>
            <div class="text-[11px] text-slate-400 flex items-center gap-2">
              <span>${m.uploadedBy}</span>
              <span>·</span>
              <span>${m.uploadedAt}</span>
              ${m.modified && m.versions.length >= 2 ? `
                <span class="ml-auto text-cyan-400 hover:text-cyan-300">查看对比 →</span>
              ` : ''}
            </div>
          </div>
        `;
      });
    }

    panel.innerHTML = html;
  }

  function renderMaterials() {
    const list = document.getElementById('materialList');
    list.innerHTML = '';
    MATERIALS.forEach(m => {
      const item = document.createElement('div');
      item.className = 'material-item' + (m.modified ? ' modified' : '');
      const typeIcon = m.type === 'cad' ? '📐' : m.type === 'attachment' ? '📎' : '💬';
      item.innerHTML = `
        <div class="flex items-center gap-1.5 min-w-0">
          <span>${typeIcon}</span>
          <span class="truncate">${m.name}</span>
        </div>
        ${m.modified ? `<span class="text-[10px] text-amber-300 shrink-0">v${m.versions.length}</span>` : ''}
      `;
      item.onclick = () => showMaterial(m.id);
      list.appendChild(item);
    });
  }

  function showMaterial(id) {
    const m = MATERIALS.find(x => x.id === id);
    if (!m) return;
    const typeIcon = m.type === 'cad' ? '📐' : m.type === 'attachment' ? '📎' : '💬';

    let versionsHtml = '';
    if (m.versions.length > 1) {
      versionsHtml += `<div class="mt-3 pt-3 border-t border-slate-700"><div class="text-xs font-semibold text-slate-200 mb-2">版本变更对比</div>`;
      for (let i = m.versions.length - 1; i >= 0; i--) {
        const v = m.versions[i];
        const isLatest = i === m.versions.length - 1;
        versionsHtml += `
          <div class="mb-2 p-2 rounded ${isLatest ? 'bg-emerald-900/20 border border-emerald-700/40' : 'bg-slate-900/50 border border-slate-700'}">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold ${isLatest ? 'text-emerald-300' : 'text-slate-300'}">v${v.v} ${isLatest ? '（当前）' : ''}</span>
              <span class="text-[10px] text-slate-400">${v.date}</span>
            </div>
            <div class="text-xs text-slate-200">${v.note}</div>
            ${v.diff ? `<div class="mt-1 text-[11px] ${isLatest ? 'text-emerald-300 version-diff-new' : 'text-rose-300 version-diff-old'} rounded px-1.5 py-0.5 inline-block">口径变更：${v.diff}</div>` : ''}
          </div>
        `;
      }
      versionsHtml += `</div>`;
    } else {
      versionsHtml += `<div class="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400 italic">无版本变更</div>`;
    }

    showModal(`
      <div class="p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${typeIcon}</span>
            <div>
              <h3 class="text-base font-semibold text-slate-100">${m.name}</h3>
              <p class="text-xs text-slate-400 mt-0.5">${m.uploadedBy} · ${m.uploadedAt}</p>
            </div>
          </div>
          <button onclick="Detail.closeModal()" class="text-slate-400 hover:text-slate-200 p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        ${m.modified ? `<div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mb-3 text-xs text-amber-300">⚠ 此材料共有 ${m.versions.length} 个版本，口径后来改过 ${m.versions.length - 1} 次</div>` : ''}
        <div class="detail-section-title">最新说明</div>
        <div class="bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 leading-relaxed">${m.versions[m.versions.length - 1].note}</div>
        ${versionsHtml}
      </div>
    `);
  }

  function showModal(content) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target === this) Detail.closeModal()">
        <div class="modal-card">${content}</div>
      </div>
    `;
  }

  function closeModal() {
    document.getElementById('modalRoot').innerHTML = '';
  }

  function typeLabel(code) {
    return { START: '起点', END: '终点', DELIVER: '配送', WAIT: '避让/等待', RETURN: '返程' }[code] || code;
  }

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return { init, renderPoint, clear, showMaterial, closeModal };
})();
