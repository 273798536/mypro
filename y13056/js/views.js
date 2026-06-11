// ============================================================
// 视图条件保存模块
// ============================================================

const Views = (() => {
  function init() {
    renderList();
    document.getElementById('btnSaveView').onclick = saveCurrent;
  }

  function renderList() {
    const list = document.getElementById('savedViewList');
    list.innerHTML = '';
    if (!STATE.savedViews.length) {
      list.innerHTML = `<div class="text-xs text-slate-500 italic py-1">暂无已保存视图</div>`;
      return;
    }
    STATE.savedViews.forEach((v, i) => {
      const item = document.createElement('div');
      item.className = 'view-item';
      item.innerHTML = `
        <div class="min-w-0 flex-1">
          <div class="text-slate-200 truncate">${v.name}</div>
          <div class="text-[10px] text-slate-500 mt-0.5">${v.savedAt}</div>
        </div>
        <button class="text-rose-400 hover:text-rose-300 ml-1 p-0.5" data-idx="${i}">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"/></svg>
        </button>
      `;
      item.querySelector('button').onclick = (e) => { e.stopPropagation(); remove(i); };
      item.onclick = () => apply(v);
      list.appendChild(item);
    });
  }

  function saveCurrent() {
    const ds = DATASETS[STATE.currentDatasetId];
    const name = prompt('为当前视图命名：', `${ds.title} · ${fmtNow()}`);
    if (!name) return;
    STATE.savedViews.unshift({
      name,
      savedAt: fmtNow(),
      datasetId: STATE.currentDatasetId,
      currentTime: STATE.currentTime,
      selectedPointId: STATE.selectedPointId,
      cad: { ...STATE.cad },
      activeLayers: [...STATE.activeLayers],
    });
    renderList();
    flash('视图已保存');
  }

  function remove(i) {
    STATE.savedViews.splice(i, 1);
    renderList();
  }

  function apply(v) {
    const datasetChanged = v.datasetId !== STATE.currentDatasetId;
    STATE.currentDatasetId = v.datasetId;
    document.getElementById('datasetSelect').value = v.datasetId;

    if (datasetChanged) {
      STATE.selectedPointId = null;
      Timeline.reloadDataset();
    }

    STATE.currentTime = v.currentTime;
    STATE.selectedPointId = v.selectedPointId;
    STATE.cad = { ...v.cad };
    STATE.activeLayers = [...v.activeLayers];

    document.getElementById('timelineSlider').value = Timeline.progressPercent();
    document.getElementById('currentTimeLabel').textContent = fmtTime(v.currentTime);
    document.getElementById('playStatus').textContent = '已暂停';
    document.getElementById('playStatus').className = 'text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300';
    CAD.renderLayers();
    CAD.draw();

    if (!datasetChanged) {
      Timeline.update();
    }

    const ds = DATASETS[v.datasetId];
    const p = ds.points.find(x => x.id === v.selectedPointId);
    if (p) Detail.renderPoint(p);
    else Detail.clear();

    document.getElementById('infoCampus').textContent = ds.campus;
    document.getElementById('infoFloor').textContent = ds.floor;
    document.getElementById('infoRobot').textContent = ds.robot;

    flash('已恢复视图');
  }

  function fmtNow() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  }

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function flash(msg) {
    const el = document.createElement('div');
    el.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[200] bg-cyan-600 text-white text-sm px-4 py-2 rounded-lg shadow-xl';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; }, 1200);
    setTimeout(() => el.remove(), 1600);
  }

  return { init, renderList, remove, flash, apply };
})();
