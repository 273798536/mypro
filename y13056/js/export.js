// ============================================================
// 导出模块：截图 / PNG / HTML 报告
// ============================================================

const Export = (() => {
  function init() {
    const menuBtn = document.getElementById('btnExportMenu');
    const dropdown = document.getElementById('exportDropdown');

    menuBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    };

    document.addEventListener('click', () => {
      dropdown.classList.add('hidden');
    });

    document.getElementById('btnScreenshotView').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.add('hidden');
      screenshotView();
    };
    document.getElementById('btnExportPng').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.add('hidden');
      exportPng();
    };
    document.getElementById('btnExportReport').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.add('hidden');
      exportReport();
    };
  }

  function getMetadata() {
    const ds = DATASETS[STATE.currentDatasetId];
    const selectedPoint = ds.points.find(p => p.id === STATE.selectedPointId);
    const now = new Date();
    return {
      datasetId: STATE.currentDatasetId,
      datasetTitle: ds.title,
      campus: ds.campus,
      floor: ds.floor,
      robot: ds.robot,
      shift: ds.shift,
      exportTime: now.toISOString(),
      exportTimeLocal: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      currentTime: STATE.currentTime,
      currentTimeLabel: fmtTime(STATE.currentTime),
      selectedPointId: STATE.selectedPointId,
      selectedPointLabel: selectedPoint ? selectedPoint.label : null,
      activeLayers: [...STATE.activeLayers],
      cadScale: STATE.cad.scale.toFixed(2),
      cadOffset: `(${Math.round(STATE.cad.offsetX)}, ${Math.round(STATE.cad.offsetY)})`,
      viewName: null,
    };
  }

  function buildFileName(prefix) {
    const meta = getMetadata();
    const date = new Date();
    const ts = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    const point = meta.selectedPointId ? `_${meta.selectedPointId}` : '';
    return `医院物流机器人_${meta.datasetId}${point}_${prefix}_${ts}`;
  }

  async function captureMainArea() {
    if (typeof html2canvas === 'undefined') {
      Views.flash('html2canvas 未加载');
      return null;
    }
    const target = document.querySelector('main');
    if (!target) return null;
    Views.flash('正在截图...');
    try {
      const canvas = await html2canvas(target, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      return canvas;
    } catch (err) {
      console.error('截图失败:', err);
      Views.flash('截图失败: ' + err.message);
      return null;
    }
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function screenshotView() {
    const canvas = await captureMainArea();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, buildFileName('截图') + '.png');
    Views.flash('截图已下载');
  }

  async function exportPng() {
    const canvas = await captureMainArea();
    if (!canvas) return;
    const meta = getMetadata();

    const outCanvas = document.createElement('canvas');
    const headerHeight = 120;
    outCanvas.width = canvas.width;
    outCanvas.height = canvas.height + headerHeight;
    const ctx = outCanvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px -apple-system, "PingFang SC", sans-serif';
    ctx.fillText('医院物流机器人时序回放 - 导出截图', 40, 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, "PingFang SC", sans-serif';
    ctx.fillText(`数据集：${meta.datasetTitle}`, 40, 78);
    ctx.fillText(`院区：${meta.campus} · ${meta.floor} · 机器人 ${meta.robot}`, 40, 100);
    ctx.fillText(`回放时间：${meta.currentTimeLabel}`, 400, 78);
    ctx.fillText(`导出时间：${meta.exportTimeLocal}`, 400, 100);

    ctx.drawImage(canvas, 0, headerHeight);

    const dataUrl = outCanvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, buildFileName('PNG') + '.png');
    Views.flash('PNG 已导出');
  }

  async function exportReport() {
    Views.flash('正在生成报告...');
    const ds = DATASETS[STATE.currentDatasetId];
    const meta = getMetadata();
    const selectedPoint = ds.points.find(p => p.id === STATE.selectedPointId);

    const canvas = await captureMainArea();
    const screenshotDataUrl = canvas ? canvas.toDataURL('image/png') : '';

    const statusColor = p => p.status === 'anomaly' ? '#f43f5e' : p.status === 'delay' ? '#f59e0b' : '#10b981';
    const statusText = p => p.status === 'anomaly' ? '异常' : p.status === 'delay' ? '延迟' : '正常';

    let pointsHtml = '';
    ds.points.forEach(p => {
      const sel = p.id === STATE.selectedPointId ? ' style="background:rgba(6,182,212,0.1);border-left:3px solid #06b6d4"' : '';
      pointsHtml += `
        <tr${sel}>
          <td style="padding:8px 12px;border-bottom:1px solid #334155;font-weight:600">${p.id}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #334155">${p.label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #334155;font-family:monospace">${fmtTime(p.plannedTime)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #334155;font-family:monospace">${fmtTime(p.actualTime)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #334155;color:${statusColor(p)};font-weight:600">${statusText(p)}${p.delaySec > 0 ? ` +${p.delaySec}s` : ''}</td>
        </tr>
      `;
    });

    let pointDetailHtml = '';
    if (selectedPoint) {
      const p = selectedPoint;
      const color = statusColor(p);

      let traceHtml = '';
      if (p.trace && p.trace.length) {
        p.trace.forEach(t => {
          traceHtml += `
            <div style="position:relative;padding-left:20px;padding-bottom:12px;border-left:1.5px dashed #475569">
              <div style="position:absolute;left:-4px;top:4px;width:7px;height:7px;border-radius:50%;background:#22d3ee;box-shadow:0 0 4px #22d3ee"></div>
              <div style="font-size:13px;color:#e2e8f0">${t.desc}</div>
              <div style="margin-top:4px;font-size:11px;color:#94a3b8">
                ${t.source ? `<span style="background:rgba(6,182,212,0.1);color:#22d3ee;padding:1px 6px;border-radius:3px;margin-right:6px">来源：${t.source}</span>` : ''}
                ${t.time ? `<span style="color:#64748b">${t.time}</span>` : ''}
              </div>
            </div>
          `;
        });
      }

      let materialsHtml = '';
      if (p.materials && p.materials.length) {
        p.materials.forEach(mid => {
          const m = MATERIALS.find(x => x.id === mid);
          if (!m) return;
          const typeIcon = m.type === 'cad' ? '📐' : m.type === 'attachment' ? '📎' : '💬';
          materialsHtml += `
            <div style="background:rgba(15,23,42,0.6);border:1px solid ${m.modified ? 'rgba(245,158,11,0.5)' : '#334155'};border-radius:8px;padding:12px;margin-bottom:8px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <div style="display:flex;align-items:center;gap:6px">
                  <span>${typeIcon}</span>
                  <span style="font-size:13px;font-weight:600;color:#e2e8f0">${m.name}</span>
                </div>
                ${m.modified ? `<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4)">口径已改 v${m.versions.length}</span>` : ''}
              </div>
              <div style="font-size:11px;color:#94a3b8">${m.uploadedBy} · ${m.uploadedAt}</div>
              ${m.modified ? `
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid #334155;font-size:11px">
                  <div style="color:#fbbf24;font-weight:600;margin-bottom:4px">版本变更：</div>
                  ${m.versions.slice().reverse().map((v, i) => `
                    <div style="padding:4px 8px;border-radius:4px;margin-bottom:4px;${i === 0 ? 'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.4)' : 'background:rgba(15,23,42,0.5);border:1px solid #334155'}">
                      <span style="font-family:monospace;color:${i === 0 ? '#6ee7b7' : '#94a3b8'};font-weight:600">v${v.v}</span>
                      <span style="color:#64748b;margin:0 6px">·</span>
                      <span style="color:#64748b">${v.date}</span>
                      ${v.diff ? `
                        <span style="color:${i === 0 ? '#6ee7b7' : '#fca5a5'};margin-left:6px;padding:1px 4px;border-radius:2px;background:${i === 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}">口径变更：${v.diff}</span>
                      ` : ''}
                      <div style="margin-top:4px;color:#cbd5e1">${v.note}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        });
      }

      const layerRef = CAD_LAYERS.find(l => l.id === p.cadLayerRef);

      pointDetailHtml = `
        <div style="margin-top:24px">
          <h3 style="font-size:16px;font-weight:700;color:#e2e8f0;margin:0 0 16px 0;padding-bottom:8px;border-bottom:1px solid #334155">🔍 点位详情 · ${p.id}</h3>

          <div style="background:rgba(15,23,42,0.6);border:1px solid #334155;border-radius:8px;padding:16px;margin-bottom:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <span style="font-size:20px;font-weight:700;color:${color}">${p.id}</span>
              <span style="font-size:12px;padding:3px 10px;border-radius:4px;background:${color}22;color:${color};border:1px solid ${color}55;font-weight:600">${statusText(p)}${p.delaySec > 0 ? ` +${p.delaySec}s` : ''}</span>
            </div>
            <div style="font-size:14px;color:#e2e8f0;font-weight:600;margin-bottom:12px">${p.label}</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;font-size:12px">
              <div><div style="color:#64748b;margin-bottom:2px">计划时间</div><div style="color:#e2e8f0;font-family:monospace">${fmtTime(p.plannedTime)}</div></div>
              <div><div style="color:#64748b;margin-bottom:2px">实际时间</div><div style="color:#e2e8f0;font-family:monospace">${fmtTime(p.actualTime)}</div></div>
              <div><div style="color:#64748b;margin-bottom:2px">点位类型</div><div style="color:#e2e8f0">${typeLabel(p.code)}</div></div>
              <div><div style="color:#64748b;margin-bottom:2px">坐标</div><div style="color:#e2e8f0;font-family:monospace">(${p.x}, ${p.y})</div></div>
            </div>
            ${p.confirmed ? `
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid #334155;font-size:12px;color:#6ee7b7">✓ 已确认 · ${p.confirmedBy} · ${p.confirmedAt}</div>
            ` : p.status !== 'ok' ? `
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid #334155;font-size:12px;color:#fbbf24">⚠ 待人工确认</div>
            ` : ''}
          </div>

          ${p.anomaly ? `
            <div style="margin-bottom:16px">
              <h4 style="font-size:13px;font-weight:600;color:#fca5a5;margin:0 0 8px 0;display:flex;align-items:center;gap:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19H3.5L12 5.5zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z"/></svg>
                异常信息 · ${p.anomaly.code}
              </h4>
              <div style="border-left:3px solid #f43f5e;background:linear-gradient(90deg, rgba(244,63,94,0.15), transparent);padding:12px 16px;border-radius:8px;">
                <div style="font-size:12px;color:#fca5a5;font-weight:600;margin-bottom:4px">${p.anomaly.type}</div>
                <div style="font-size:12px;color:#e2e8f0;line-height:1.6">${p.anomaly.description}</div>
                <div style="margin-top:8px;font-size:12px">
                  <span style="color:#64748b">根因分析：</span>
                  <span style="color:#fbbf24">${p.anomaly.rootCause}</span>
                </div>
              </div>
            </div>
          ` : ''}

          ${traceHtml ? `
            <div style="margin-bottom:16px">
              <h4 style="font-size:13px;font-weight:600;color:#22d3ee;margin:0 0 8px 0;display:flex;align-items:center;gap:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                追溯链条 · ${p.trace.length} 步
              </h4>
              ${traceHtml}
            </div>
          ` : ''}

          ${layerRef ? `
            <div style="margin-bottom:16px">
              <h4 style="font-size:13px;font-weight:600;color:#60a5fa;margin:0 0 8px 0;display:flex;align-items:center;gap:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                CAD 图层原始说法
              </h4>
              <div style="background:rgba(37,99,235,0.1);border:1px solid rgba(37,99,235,0.4);border-radius:8px;padding:12px">
                <div style="font-size:12px;color:#93c5fd;font-weight:600;margin-bottom:4px">${layerRef.name}</div>
                <div style="font-size:12px;color:#e2e8f0;line-height:1.6">${layerRef.originalNote}</div>
              </div>
            </div>
          ` : ''}

          ${materialsHtml ? `
            <div>
              <h4 style="font-size:13px;font-weight:600;color:#a78bfa;margin:0 0 8px 0;display:flex;align-items:center;gap:6px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                关联材料 · ${p.materials.length} 份
              </h4>
              ${materialsHtml}
            </div>
          ` : ''}
        </div>
      `;
    }

    const historyHtml = ds.history && ds.history.length ? `
      <div style="margin-top:24px">
        <h3 style="font-size:16px;font-weight:700;color:#e2e8f0;margin:0 0 16px 0;padding-bottom:8px;border-bottom:1px solid #334155">📜 变更历史</h3>
        <div style="font-family:-apple-system, 'PingFang SC', sans-serif">
          ${ds.history.map((e, i) => {
            const actorColor = e.actor === '系统' ? '#94a3b8' : e.actor.includes('护士') ? '#34d399' : e.actor.includes('小赵') ? '#fbbf24' : '#22d3ee';
            return `
              <div style="position:relative;padding-left:20px;padding-bottom:16px;border-left:1.5px dashed #475569">
                <div style="position:absolute;left:-4px;top:4px;width:7px;height:7px;border-radius:50%;background:${actorColor};box-shadow:0 0 4px ${actorColor}"></div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                  <span style="font-size:12px;font-weight:600;color:${actorColor}">${e.actor}</span>
                  <span style="font-size:11px;padding:2px 8px;border-radius:3px;background:#334155;color:#cbd5e1">${e.action}</span>
                  <span style="font-size:11px;color:#64748b;margin-left:auto">${e.time}</span>
                </div>
                <div style="font-size:12px;color:#e2e8f0;line-height:1.5">${e.detail}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    const materialsChanges = MATERIALS.filter(m => m.modified);
    const materialsChangesHtml = materialsChanges.length ? `
      <div style="margin-top:24px">
        <h3 style="font-size:16px;font-weight:700;color:#e2e8f0;margin:0 0 16px 0;padding-bottom:8px;border-bottom:1px solid #334155">📝 材料口径修订</h3>
        ${materialsChanges.map(m => `
          <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:12px;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
              <span style="font-size:14px;color:#fbbf24">📝</span>
              <span style="font-size:13px;font-weight:600;color:#e2e8f0">${m.name}</span>
              <span style="font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid rgba(245,158,11,0.4)">口径变更 ×${m.versions.length - 1}</span>
            </div>
            <div style="font-size:11px;color:#94a3b8;line-height:1.5">
              ${m.versions.slice().reverse().map((v, i) => `
                <div style="padding:4px 0;border-bottom:1px dashed #334155;${i === m.versions.length - 1 ? 'border-bottom:none' : ''}">
                  <span style="font-family:monospace;color:${i === 0 ? '#6ee7b7' : '#94a3b8'};font-weight:600">v${v.v}</span>
                  <span style="color:#64748b;margin:0 6px">·</span>
                  <span style="color:#64748b">${v.date}</span>
                  ${v.diff ? ` · <span style="color:${i === 0 ? '#6ee7b7' : '#fca5a5'}">口径变更：${v.diff}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>医院物流机器人时序回放报告 - ${meta.datasetTitle}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: #020617; color: #e2e8f0; margin: 0; padding: 0; }
  .container { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
  .header { background: linear-gradient(135deg, #0891b2, #1e40af); padding: 32px; border-radius: 12px; margin-bottom: 32px; }
  .header h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px 0; }
  .header p { font-size: 14px; color: #bae6fd; margin: 0; }
  .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 24px; }
  .meta-item { background: rgba(15,23,42,0.6); border: 1px solid #334155; border-radius: 8px; padding: 12px; }
  .meta-label { font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-value { font-size: 13px; color: #e2e8f0; font-weight: 600; }
  .screenshot-container { background: rgba(15,23,42,0.6); border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
  .screenshot-container img { width: 100%; border-radius: 8px; display: block; }
  table { width: 100%; border-collapse: collapse; background: rgba(15,23,42,0.6); border-radius: 8px; overflow: hidden; }
  th { background: #1e293b; padding: 10px 12px; text-align: left; font-size: 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #334155; }
  td { font-size: 12px; color: #cbd5e1; }
  tr:hover { background: rgba(30,41,59,0.5); }
  .section-title { font-size: 16px; font-weight: 700; color: #e2e8f0; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #334155; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #334155; text-align: center; font-size: 11px; color: #64748b; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🏥 医院物流机器人时序回放报告</h1>
    <p>${meta.datasetTitle} · ${meta.exportTimeLocal}</p>
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">院区</div><div class="meta-value">${meta.campus}</div></div>
      <div class="meta-item"><div class="meta-label">楼层</div><div class="meta-value">${meta.floor}</div></div>
      <div class="meta-item"><div class="meta-label">机器人</div><div class="meta-value">${meta.robot}</div></div>
      <div class="meta-item"><div class="meta-label">班次</div><div class="meta-value">${meta.shift}</div></div>
      <div class="meta-item"><div class="meta-label">回放时间点</div><div class="meta-value">${meta.currentTimeLabel}</div></div>
      <div class="meta-item"><div class="meta-label">选中点位</div><div class="meta-value">${meta.selectedPointId ? `${meta.selectedPointId} · ${meta.selectedPointLabel}` : '无'}</div></div>
      <div class="meta-item"><div class="meta-label">CAD 图层</div><div class="meta-value">${meta.activeLayers.length} 个已启用</div></div>
      <div class="meta-item"><div class="meta-label">视图缩放</div><div class="meta-value">${meta.cadScale}x</div></div>
    </div>
  </div>

  <div class="screenshot-container">
    <div style="font-size:13px;color:#94a3b8;margin-bottom:12px;font-weight:600">📷 当前视图截图</div>
    ${screenshotDataUrl ? `<img src="${screenshotDataUrl}" alt="当前视图截图" />` : '<div style="color:#f87171;text-align:center;padding:40px">截图生成失败</div>'}
  </div>

  <div>
    <div class="section-title">📊 点位时序数据</div>
    <table>
      <thead><tr><th>点位</th><th>位置</th><th>计划时间</th><th>实际时间</th><th>状态</th></tr></thead>
      <tbody>${pointsHtml}</tbody>
    </table>
  </div>

  ${pointDetailHtml}
  ${historyHtml}
  ${materialsChangesHtml}

  <div class="footer">
    本报告由医院物流机器人时序回放系统自动生成 · 导出时间 ${meta.exportTimeLocal}<br>
    数据来源：${meta.datasetTitle}
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, buildFileName('报告') + '.html');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Views.flash('HTML 报告已导出');
  }

  function fmtTime(sec) {
    const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function typeLabel(code) {
    return { START: '起点', END: '终点', DELIVER: '配送', WAIT: '避让/等待', RETURN: '返程' }[code] || code;
  }

  return { init, screenshotView, exportPng, exportReport, getMetadata, buildFileName };
})();
