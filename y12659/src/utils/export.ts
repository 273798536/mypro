import type { DemoSession } from '@/types';
import { THRESHOLD_CONFIG, TOTAL_DURATION, PLANE_START, PLANE_END } from '@/data/mockData';
import { formatTime, getRiskLabel } from './collision';

export function exportScreenshotWithWatermark(
  canvas: HTMLCanvasElement | null,
  session: Partial<DemoSession> & { currentTime: number; plane: any }
): string {
  if (!canvas) return '';

  const w = canvas.width;
  const h = canvas.height;
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const ctx = tmp.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(canvas, 0, 0, w, h);

  const barH = 90;
  ctx.fillStyle = 'rgba(10, 22, 40, 0.92)';
  ctx.fillRect(0, h - barH, w, barH);
  ctx.strokeStyle = '#E87722';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h - barH);
  ctx.lineTo(w, h - barH);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Space Grotesk", sans-serif';
  ctx.fillText('矿山边坡稳定演示 · 检测帧快照', 20, h - barH + 30);

  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`时间: ${formatTime(session.currentTime)} / ${formatTime(TOTAL_DURATION)}`, 20, h - barH + 52);
  ctx.fillText(`剖切面位置: X=${session.plane?.position?.toFixed(2) ?? '--'}m`, 20, h - barH + 72);

  ctx.fillStyle = session.plane?.isOutOfBounds ? '#D7263D' : '#4ADE80';
  ctx.fillText(
    `最小距离: ${isNaN(session.plane?.minDistance) ? '数据缺失' : session.plane.minDistance.toFixed(3) + 'm'}`,
    260,
    h - barH + 52
  );
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    `状态: ${session.plane?.isOutOfBounds ? '越界-已拦截' : '检测正常'}`,
    260,
    h - barH + 72
  );

  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748B';
  const rightX = w - 220;
  ctx.fillText(`阈值: 安全≥${THRESHOLD_CONFIG.safeDistance}m 越界<${THRESHOLD_CONFIG.dangerDistance}m`, rightX, h - barH + 52);
  ctx.fillText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, rightX, h - barH + 72);

  return tmp.toDataURL('image/png');
}

export function downloadDataURL(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function buildReportHTML(session: DemoSession): string {
  const oobEvents = session.events.filter((e) => e.type === 'out-of-bounds');
  const unusable = session.events.filter((e) => !e.isRecordUsable);
  const warnings = session.events.filter((e) => e.type === 'warning');

  const eventsRows = session.events
    .map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><code>${e.timestamp.toFixed(2)}s</code></td>
        <td>
          <span class="tag tag-${e.type}">
            ${e.type === 'out-of-bounds' ? '越界' : e.type === 'data-missing' ? '数据缺失' : e.type === 'collision' ? '碰撞' : '预警'}
          </span>
        </td>
        <td>${isNaN(e.minDistance) ? 'N/A' : e.minDistance.toFixed(3) + 'm'}</td>
        <td>${e.threshold}m</td>
        <td>${e.isRecordUsable ? '✓' : '<span style="color:#8B5CF6">✗ 不可用</span>'}</td>
        <td style="text-align:left">${e.description}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>矿山边坡稳定演示 - 检测报告</title>
<style>
  body { font-family: "IBM Plex Sans", system-ui, sans-serif; max-width: 1100px; margin: 0 auto; padding: 40px 30px; color: #1e293b; background: #f8fafc; }
  h1 { font-family: "Space Grotesk", sans-serif; color: #1B3A5C; border-bottom: 3px solid #E87722; padding-bottom: 12px; }
  h2 { font-family: "Space Grotesk", sans-serif; color: #1B3A5C; margin-top: 36px; font-size: 20px; }
  h3 { font-size: 16px; color: #334155; }
  code { font-family: "JetBrains Mono", monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
  .stat-card { background: #fff; padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .stat-label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
  .stat-value { font-family: "JetBrains Mono", monospace; font-size: 28px; font-weight: 700; color: #1B3A5C; }
  .danger { color: #D7263D !important; }
  .warning { color: #F59E0B !important; }
  .purple { color: #8B5CF6 !important; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; background: #fff; }
  th, td { padding: 10px 12px; text-align: center; border: 1px solid #e2e8f0; }
  th { background: #1B3A5C; color: #fff; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  .tag { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; color: #fff; }
  .tag-out-of-bounds { background: #D7263D; }
  .tag-warning { background: #F59E0B; }
  .tag-data-missing { background: #8B5CF6; }
  .tag-collision { background: #0EA5E9; }
  .explain { background: #EFF6FF; border-left: 4px solid #1B3A5C; padding: 16px 20px; margin: 16px 0; border-radius: 6px; }
  .explain p { margin: 4px 0; font-size: 13px; line-height: 1.7; }
  .oob-card { background: #FEF2F2; border: 1px solid #FECACA; padding: 14px; border-radius: 8px; margin: 10px 0; }
  .unusable-card { background: #FAF5FF; border: 1px solid #E9D5FF; padding: 14px; border-radius: 8px; margin: 10px 0; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
</style>
</head>
<body>

<h1>矿山边坡稳定演示 · 剖切面越界检测报告</h1>
<p class="meta">
  生成时间：${new Date().toLocaleString('zh-CN')} &nbsp;|&nbsp;
  演示会话ID：<code>${session.id}</code>
</p>

<h2>一、结果概览</h2>
<div class="grid">
  <div class="stat-card">
    <div class="stat-label">演示总时长</div>
    <div class="stat-value">${formatTime(session.totalDuration)}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">剖切面越界次数</div>
    <div class="stat-value danger">${oobEvents.length}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">预警次数</div>
    <div class="stat-value warning">${warnings.length}</div>
  </div>
  <div class="stat-card">
    <div class="stat-label">不可用记录数</div>
    <div class="stat-value purple">${unusable.length}</div>
  </div>
</div>

<h2>二、为什么剖切面越界会被拦住？</h2>
<div class="explain">
  <p><b>判定逻辑（非一次性判断）：</b></p>
  <p>1. 剖切面从 X=${PLANE_START}m 推进至 X=${PLANE_END}m，总时长 ${TOTAL_DURATION}s</p>
  <p>2. 每帧计算所有点云到剖切面的垂直距离，取最小值</p>
  <p>3. 安全阈值：距离 ≥ ${THRESHOLD_CONFIG.safeDistance}m 为安全；预警区间 ${THRESHOLD_CONFIG.warningDistance}~${THRESHOLD_CONFIG.safeDistance}m；距离 <b>< ${THRESHOLD_CONFIG.dangerDistance}m</b> 为越界</p>
  <p>4. <b>必须连续 ${THRESHOLD_CONFIG.consecutiveFrames} 帧</b>检测到越界才触发拦截，避免单点噪声误报</p>
  <p>5. 触发后自动记录事件帧号、最小距离、涉及点编号、传感器信息</p>
</div>

<h2>三、哪些记录不能用于评审？</h2>
${unusable.length === 0 ? '<p>本次演示所有记录均可用。</p>' : unusable.map((e) => `
  <div class="unusable-card">
    <h3><code>t=${e.timestamp.toFixed(2)}s</code> 记录不可用</h3>
    <p><b>原因：</b>${e.unusableReason || e.description}</p>
    <p style="color:#8B5CF6;font-size:12px">评审结论：该时间段数据排除，不纳入越界判定统计</p>
  </div>
`).join('')}

<h2>四、所有越界事件明细</h2>
${oobEvents.length === 0 ? '<p>本次演示无越界事件。</p>' : oobEvents.map((e, i) => `
  <div class="oob-card">
    <h3>越界 #${i + 1} · <code>t=${e.timestamp.toFixed(2)}s</code> · 剖切面 X=${e.planePosition.toFixed(2)}m</h3>
    <p><b>最小距离：</b>${e.minDistance.toFixed(3)}m（阈值 ${e.threshold}m，差值 ${(e.threshold - e.minDistance).toFixed(3)}m）</p>
    <p><b>涉及点云：</b>${e.involvedPoints.map((p) => `<code>${p}</code>`).join('、') || '无'}</p>
    <p><b>说明：</b>${e.description}</p>
    <p style="color:#D7263D;font-size:12px"><b>评审结论：</b>该帧触发自动拦截，该区域边坡剖面不满足安全距离要求</p>
  </div>
`).join('')}

<h2>五、完整事件记录表</h2>
<table>
  <thead>
    <tr>
      <th>#</th><th>时间</th><th>类型</th><th>最小距离</th><th>阈值</th><th>记录可用</th><th style="text-align:left">描述</th>
    </tr>
  </thead>
  <tbody>${eventsRows}</tbody>
</table>

<h2>六、报告结论</h2>
<div class="explain">
  <p>本次演示共检测 <b>${session.events.length}</b> 个事件，其中剖切面越界 <b class="danger">${oobEvents.length}</b> 次，预警 <b class="warning">${warnings.length}</b> 次，不可用记录 <b class="purple">${unusable.length}</b> 条。</p>
  <p>最高风险等级：<b class="${session.maxRiskLevel === 'danger' ? 'danger' : session.maxRiskLevel === 'warning' ? 'warning' : ''}">${getRiskLabel(session.maxRiskLevel)}</b></p>
  <p>所有越界事件均通过连续 ${THRESHOLD_CONFIG.consecutiveFrames} 帧判定，符合矿山边坡监测规范要求。</p>
</div>

</body>
</html>`;
}

export function downloadReportHTML(session: DemoSession) {
  const html = buildReportHTML(session);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `边坡稳定检测报告_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
