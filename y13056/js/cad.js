// ============================================================
// CAD 图层渲染模块
// ============================================================

const CAD = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  let svg = null;
  let container = null;
  let tooltip = null;
  let rootG = null;
  let isDragging = false;
  let dragStart = null;
  let lastOffset = { x: 0, y: 0 };

  function init() {
    svg = document.getElementById('cadCanvas');
    container = document.getElementById('cadContainer');
    tooltip = document.getElementById('pointTooltip');
    renderLayers();
    bindEvents();
    draw();
  }

  function renderLayers() {
    const list = document.getElementById('cadLayerList');
    list.innerHTML = '';
    CAD_LAYERS.forEach(layer => {
      const item = document.createElement('div');
      item.className = 'layer-item' + (STATE.activeLayers.includes(layer.id) ? ' active' : '');
      item.innerHTML = `<span>${layer.name}</span><span class="text-slate-500">${layer.type === 'structure' ? '结构' : layer.type === 'room' ? '房间' : layer.type === 'path' ? '通道' : '点位'}</span>`;
      item.onclick = () => toggleLayer(layer.id);
      list.appendChild(item);
    });
  }

  function toggleLayer(id) {
    const i = STATE.activeLayers.indexOf(id);
    if (i >= 0) STATE.activeLayers.splice(i, 1);
    else STATE.activeLayers.push(id);
    renderLayers();
    draw();
  }

  function bindEvents() {
    svg.addEventListener('mousedown', e => {
      if (e.target.closest('.cad-point')) return;
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      lastOffset = { x: STATE.cad.offsetX, y: STATE.cad.offsetY };
    });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      STATE.cad.offsetX = lastOffset.x + (e.clientX - dragStart.x);
      STATE.cad.offsetY = lastOffset.y + (e.clientY - dragStart.y);
      applyTransform();
    });
    window.addEventListener('mouseup', () => isDragging = false);

    document.getElementById('btnZoomIn').onclick = () => zoom(1.2);
    document.getElementById('btnZoomOut').onclick = () => zoom(1 / 1.2);
    document.getElementById('btnResetView').onclick = () => resetView();

    container.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoom(factor, e.clientX, e.clientY);
    }, { passive: false });
  }

  function zoom(factor, cx, cy) {
    const rect = container.getBoundingClientRect();
    const pivotX = cx ?? rect.left + rect.width / 2;
    const pivotY = cy ?? rect.top + rect.height / 2;
    const prevScale = STATE.cad.scale;
    const newScale = Math.max(0.4, Math.min(4, prevScale * factor));
    const worldX = (pivotX - rect.left - STATE.cad.offsetX) / prevScale;
    const worldY = (pivotY - rect.top - STATE.cad.offsetY) / prevScale;
    STATE.cad.scale = newScale;
    STATE.cad.offsetX = pivotX - rect.left - worldX * newScale;
    STATE.cad.offsetY = pivotY - rect.top - worldY * newScale;
    applyTransform();
  }

  function resetView() {
    STATE.cad.scale = 1;
    STATE.cad.offsetX = 0;
    STATE.cad.offsetY = 0;
    applyTransform();
    fitToContainer();
  }

  function applyTransform() {
    if (!rootG) return;
    rootG.setAttribute('transform', `translate(${STATE.cad.offsetX}, ${STATE.cad.offsetY}) scale(${STATE.cad.scale})`);
  }

  function fitToContainer() {
    if (!svg || !rootG) return;
    const rect = container.getBoundingClientRect();
    const vbWidth = FLOOR_PLAN.width;
    const vbHeight = FLOOR_PLAN.height;
    const sx = rect.width / vbWidth;
    const sy = rect.height / vbHeight;
    const s = Math.min(sx, sy) * 0.85;
    STATE.cad.scale = s;
    STATE.cad.offsetX = (rect.width - vbWidth * s) / 2;
    STATE.cad.offsetY = (rect.height - vbHeight * s) / 2;
    applyTransform();
  }

  function el(tag, attrs = {}, children = []) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    children.forEach(c => e.appendChild(c));
    return e;
  }

  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rect = container.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

    const bg = el('rect', { x: 0, y: 0, width: rect.width, height: rect.height, fill: '#020617' });
    svg.appendChild(bg);
    const gridG = el('g', { opacity: 0.25 });
    for (let x = 0; x < rect.width; x += 30) {
      gridG.appendChild(el('line', { x1: x, y1: 0, x2: x, y2: rect.height, stroke: '#1e293b', 'stroke-width': 0.5 }));
    }
    for (let y = 0; y < rect.height; y += 30) {
      gridG.appendChild(el('line', { x1: 0, y1: y, x2: rect.width, y2: y, stroke: '#1e293b', 'stroke-width': 0.5 }));
    }
    svg.appendChild(gridG);

    rootG = el('g', {});
    svg.appendChild(rootG);

    if (STATE.activeLayers.includes('L-001')) drawStructure();
    if (STATE.activeLayers.includes('L-002')) drawRooms();
    if (STATE.activeLayers.includes('L-003')) drawCorridor();
    drawTrajectory();
    if (STATE.activeLayers.includes('L-004')) drawPoints();
    drawRobot();

    applyTransform();
  }

  function drawStructure() {
    FLOOR_PLAN.walls.forEach(d => rootG.appendChild(el('path', { d, class: 'cad-wall' })));
  }

  function drawRooms() {
    FLOOR_PLAN.rooms.forEach(r => {
      rootG.appendChild(el('rect', {
        x: r.x, y: r.y, width: r.w, height: r.h,
        class: 'cad-room',
        rx: 3,
      }));
      const label = r.label;
      rootG.appendChild(el('text', {
        x: r.x + r.w / 2, y: r.y + r.h / 2 + 4, 'text-anchor': 'middle', class: 'cad-room-label',
      }, [document.createTextNode(label)]));
    });
  }

  function drawCorridor() {
    const c = FLOOR_PLAN.corridor;
    rootG.appendChild(el('rect', {
      x: c.x, y: c.y, width: c.w, height: c.h,
      class: 'cad-corridor',
    }));
    rootG.appendChild(el('text', {
      x: c.x + c.w / 2, y: c.y + c.h / 2 + 3, 'text-anchor': 'middle', fill: '#475569', 'font-size': '9', class: 'cad-room-label',
    }, [document.createTextNode('— 主通道 —')]));
  }

  function drawTrajectory() {
    const ds = DATASETS[STATE.currentDatasetId];
    if (!ds) return;
    const pts = ds.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1];
      const reached = STATE.currentTime >= p2.actualTime;
      rootG.appendChild(el('line', {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: reached ? 'rgba(34, 211, 238, 0.7)' : 'rgba(100, 116, 139, 0.35)',
        'stroke-width': reached ? 2.5 : 1.5,
        class: reached ? 'trajectory-seg' : '',
      }));
    }
  }

  function pointColor(p) {
    if (p.status === 'anomaly') return '#f43f5e';
    if (p.status === 'delay') return '#f59e0b';
    return '#34d399';
  }

  function drawPoints() {
    const ds = DATASETS[STATE.currentDatasetId];
    if (!ds) return;
    ds.points.forEach(p => {
      const color = pointColor(p);
      const cx = p.x, cy = p.y;
      const isSelected = STATE.selectedPointId === p.id;
      const reached = STATE.currentTime >= p.actualTime;
      const group = el('g', {
        class: 'cad-point' + (isSelected ? ' selected' : ''),
        style: `color:${color}; opacity: ${reached ? 1 : 0.4}`,
      });

      if (p.status === 'anomaly') {
        group.appendChild(el('circle', { cx, cy, r: 14, fill: color, opacity: 0.25 }));
      }
      group.appendChild(el('circle', { cx, cy, r: 7, fill: color, stroke: '#0f172a', 'stroke-width': 1.5 }));
      group.appendChild(el('circle', { cx, cy, r: 2.5, fill: '#0f172a' }));
      group.appendChild(el('text', {
        x: cx, y: cy - 14, 'text-anchor': 'middle', fill: '#e2e8f0', 'font-size': 9, 'font-weight': 600,
      }, [document.createTextNode(p.id)]));

      group.addEventListener('mouseenter', e => showTooltip(e, p));
      group.addEventListener('mousemove', e => moveTooltip(e));
      group.addEventListener('mouseleave', hideTooltip);
      group.addEventListener('click', () => {
        STATE.selectedPointId = p.id;
        App.onPointSelected(p);
        draw();
      });
      rootG.appendChild(group);
    });
  }

  function drawRobot() {
    const ds = DATASETS[STATE.currentDatasetId];
    if (!ds) return;
    const pts = ds.points;
    if (pts.length === 0) return;
    let rx = pts[0].x, ry = pts[0].y;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (STATE.currentTime < a.actualTime) { rx = a.x; ry = a.y; break; }
      if (STATE.currentTime >= b.actualTime) continue;
      const t = (STATE.currentTime - a.actualTime) / (b.actualTime - a.actualTime);
      rx = a.x + (b.x - a.x) * t;
      ry = a.y + (b.y - a.y) * t;
      break;
    }
    const last = pts[pts.length - 1];
    if (STATE.currentTime >= last.actualTime) { rx = last.x; ry = last.y; }

    const robot = el('g', { class: 'cad-robot' });
    robot.appendChild(el('circle', { cx: rx, cy: ry, r: 11, fill: '#0891b2', opacity: 0.35 }));
    robot.appendChild(el('circle', { cx: rx, cy: ry, r: 7, fill: '#22d3ee', stroke: '#0f172a', 'stroke-width': 1.5 }));
    robot.appendChild(el('path', {
      d: `M ${rx} ${ry - 3.5} m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0`,
      fill: '#0f172a',
    }));
    rootG.appendChild(robot);
  }

  function showTooltip(e, p) {
    STATE.hoverPointId = p.id;
    const color = pointColor(p);
    const statusText = p.status === 'anomaly' ? '异常' : p.status === 'delay' ? '延迟' : '正常';
    const delayText = p.delaySec > 0 ? ` +${p.delaySec}s` : '';
    tooltip.classList.remove('hidden');
    tooltip.innerHTML = `
      <div class="font-semibold" style="color:${color}">${p.id} · ${p.label}</div>
      <div class="text-slate-300 mt-1">
        <div>状态：<span class="font-medium" style="color:${color}">${statusText}${delayText}</span></div>
        <div>计划：${fmtTime(p.plannedTime)}</div>
        <div>实际：${fmtTime(p.actualTime)}</div>
        ${p.anomaly ? `<div class="mt-1 pt-1 border-t border-slate-600 text-rose-300">${p.anomaly.type}</div>` : ''}
      </div>
    `;
    moveTooltip(e);
  }

  function moveTooltip(e) {
    const rect = container.getBoundingClientRect();
    let x = e.clientX - rect.left + 14;
    let y = e.clientY - rect.top + 14;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  function hideTooltip() {
    STATE.hoverPointId = null;
    tooltip.classList.add('hidden');
  }

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return { init, draw, fitToContainer, renderLayers, pointColor, fmtTime };
})();
