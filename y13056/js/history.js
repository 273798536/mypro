// ============================================================
// 变更历史模块
// ============================================================

const History = (() => {
  function init() {
    document.getElementById('btnShowHistory').onclick = show;
  }

  function show() {
    const ds = DATASETS[STATE.currentDatasetId];
    const events = ds.history || [];

    let eventsHtml = '';
    if (events.length) {
      events.forEach((e, i) => {
        const actorColor = e.actor === '系统' ? 'text-slate-400' : e.actor.includes('护士') ? 'text-emerald-300' : e.actor.includes('小赵') ? 'text-amber-300' : 'text-cyan-300';
        eventsHtml += `
          <div class="trace-chain-item">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-semibold ${actorColor}">${e.actor}</span>
              <span class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">${e.action}</span>
              <span class="text-[10px] text-slate-500 ml-auto">${e.time}</span>
            </div>
            <div class="text-xs text-slate-200 leading-relaxed">${e.detail}</div>
          </div>
        `;
      });
    } else {
      eventsHtml = `<div class="text-xs text-slate-500 italic py-4 text-center">暂无变更历史</div>`;
    }

    const materialChanges = MATERIALS.filter(m => m.modified);
    let matHtml = '';
    if (materialChanges.length) {
      materialChanges.forEach(m => {
        matHtml += `
          <div class="bg-slate-900/60 border border-amber-600/30 rounded-lg p-3 mb-2">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-amber-300 text-sm">📝</span>
              <span class="text-xs text-slate-200 font-medium">${m.name}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">口径变更 ×${m.versions.length - 1}</span>
            </div>
            <div class="space-y-1">
              ${m.versions.slice().reverse().map((v, i) => `
                <div class="text-[11px] ${i === 0 ? 'text-emerald-300' : 'text-slate-400'}">
                  <span class="font-mono">v${v.v}</span> · <span class="text-slate-500">${v.date}</span>
                  ${v.diff ? ` · <span class="${i === 0 ? 'text-emerald-300' : 'text-rose-300'}">${v.diff}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });
    } else {
      matHtml = `<div class="text-xs text-slate-500 italic py-2">所有材料口径未变</div>`;
    }

    Detail.showModal(`
      <div class="p-5 max-h-[80vh] overflow-y-auto">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-base font-semibold text-slate-100">变更历史 · ${ds.title}</h3>
            <p class="text-xs text-slate-400 mt-0.5">灰度发布前复盘用，包含记录变更、人工确认和材料口径修订</p>
          </div>
          <button onclick="Detail.closeModal()" class="text-slate-400 hover:text-slate-200 p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="detail-section-title">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          记录变更流水
        </div>
        <div class="mb-5">${eventsHtml}</div>

        <div class="detail-section-title">
          <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          材料口径修订
        </div>
        <div>${matHtml}</div>
      </div>
    `);
  }

  return { init, show };
})();
