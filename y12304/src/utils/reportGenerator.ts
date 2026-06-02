import { mockAlarms, mockRacks, mockVents } from '../data/mockData';
import { Alarm, AlarmLevel } from '../types';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getLevelColor(level: AlarmLevel): { bg: string; border: string; text: string; label: string } {
  const config = {
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', label: '严重' },
    warning: { bg: '#fff7ed', border: '#fdba74', text: '#ea580c', label: '警告' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb', label: '信息' },
  };
  return config[level];
}

export interface ReportData {
  generatedAt: Date;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  normalRacks: number;
  warningRacks: number;
  totalRacks: number;
  totalVents: number;
  alarms: Alarm[];
  scope: string;
  duration: string;
}

export function generateReportData(): ReportData {
  const alarms = [...mockAlarms].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level];
  });

  return {
    generatedAt: new Date(),
    criticalCount: alarms.filter((a) => a.level === 'critical').length,
    warningCount: alarms.filter((a) => a.level === 'warning').length,
    infoCount: alarms.filter((a) => a.level === 'info').length,
    normalRacks: mockRacks.filter((r) => r.status === 'normal').length,
    warningRacks: mockRacks.filter((r) => r.status !== 'normal').length,
    totalRacks: mockRacks.length,
    totalVents: mockVents.length,
    alarms,
    scope: 'A区 + B区 冷热通道',
    duration: '约 15 分钟',
  };
}

export function generateReportHtml(data: ReportData): string {
  const formatDate = (d: Date) => d.toLocaleString('zh-CN');
  const levelColors: Record<AlarmLevel, { bg: string; border: string; text: string; label: string }> = {
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', label: '严重' },
    warning: { bg: '#fff7ed', border: '#fdba74', text: '#ea580c', label: '警告' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb', label: '信息' },
  };

  const alarmCardsHtml = data.alarms
    .map((alarm) => {
      const colors = levelColors[alarm.level];
      const cluesHtml = alarm.clues
        .map(
          (clue) =>
            `<span style="display:inline-block;padding:2px 8px;margin:2px 4px 2px 0;background:#e5e7eb;color:#374151;border-radius:4px;font-size:12px;">${escapeHtml(clue.description)}</span>`
        )
        .join('');

      return `
        <div style="margin-bottom:16px;padding:20px;background:${colors.bg};border:1px solid ${colors.border};border-radius:12px;">
          <div style="display:flex;gap:16px;align-items:flex-start;">
            <div style="padding:10px;background:${colors.bg};border-radius:8px;flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${colors.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
                <span style="font-weight:600;color:#1f2937;font-size:15px;">${escapeHtml(alarm.message)}</span>
                <span style="padding:2px 8px;background:${colors.bg};color:${colors.text};font-size:12px;border-radius:4px;font-weight:500;">${colors.label}</span>
              </div>
              <div style="color:#6b7280;font-size:13px;line-height:1.6;">
                <p style="margin:4px 0;display:flex;gap:6px;align-items:flex-start;">
                  <span style="color:#374151;font-weight:500;flex-shrink:0;">触发材料:</span>
                  <span>${escapeHtml(alarm.sourceMaterial)}</span>
                </p>
                <p style="margin:4px 0;display:flex;gap:6px;align-items:flex-start;">
                  <span style="color:#374151;font-weight:500;flex-shrink:0;">卡点位置:</span>
                  <span>${escapeHtml(alarm.blockPoint)}</span>
                </p>
              </div>
              <div style="margin-top:12px;padding:12px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
                <div style="font-weight:500;color:#059669;font-size:13px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  处理步骤
                </div>
                <div style="color:#4b5563;font-size:13px;white-space:pre-line;line-height:1.6;">${escapeHtml(alarm.nextStep)}</div>
              </div>
              ${alarm.clues.length > 0 ? `<div style="margin-top:10px;">${cluesHtml}</div>` : ''}
            </div>
            <div style="text-align:right;color:#9ca3af;font-size:12px;flex-shrink:0;">
              <div>${formatDate(new Date(alarm.createdAt))}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数据中心巡检报告 - ${formatDate(data.generatedAt)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #1f2937;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      padding: 32px 40px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 40px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      background: #fafafa;
    }
    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 13px;
      color: #6b7280;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title-icon {
      width: 20px;
      height: 20px;
      color: #0891b2;
    }
    .section-content {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
    }
    .overview-text {
      color: #4b5563;
      font-size: 14px;
      line-height: 1.8;
      margin-bottom: 16px;
    }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .overview-item {
      padding: 12px 16px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .overview-item-label {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .overview-item-value {
      font-size: 14px;
      color: #1f2937;
      font-weight: 500;
    }
    .conclusion {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 12px;
      padding: 20px 24px;
    }
    .conclusion-text {
      color: #166534;
      font-size: 14px;
      line-height: 1.8;
    }
    .footer {
      padding: 20px 40px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #9ca3af;
    }
    .features-list {
      color: #4b5563;
      font-size: 14px;
      line-height: 2;
    }
    .features-list li {
      margin-left: 20px;
    }
    .feature-highlight {
      color: #0891b2;
      font-weight: 600;
    }
    .text-red { color: #dc2626; }
    .text-orange { color: #ea580c; }
    .text-green { color: #16a34a; }
    .text-cyan { color: #0891b2; }
    .bg-red { background: #fef2f2; }
    .bg-orange { background: #fff7ed; }
    .bg-green { background: #f0fdf4; }
    .bg-cyan { background: #ecfeff; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>数据中心巡检报告</h1>
      <p>生成时间: ${formatDate(data.generatedAt)}</p>
    </div>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon bg-red">
            <svg class="text-red" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="stat-value text-red">${data.criticalCount}</div>
          <div class="stat-label">严重告警</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-orange">
            <svg class="text-orange" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="stat-value text-orange">${data.warningCount}</div>
          <div class="stat-label">警告告警</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-green">
            <svg class="text-green" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div class="stat-value text-green">${data.normalRacks}</div>
          <div class="stat-label">正常机柜</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon bg-cyan">
            <svg class="text-cyan" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div class="stat-value text-cyan">${data.warningRacks}</div>
          <div class="stat-label">异常机柜</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">
          <svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          一、巡检概述
        </h2>
        <div class="section-content">
          <p class="overview-text">
            本次巡检覆盖数据中心全部机柜、空调系统、线缆桥架及温度传感器。
            系统通过3D可视化技术实现全方位监控。
          </p>
          <div class="overview-grid">
            <div class="overview-item">
              <div class="overview-item-label">巡检范围</div>
              <div class="overview-item-value">${data.scope}</div>
            </div>
            <div class="overview-item">
              <div class="overview-item-label">巡检时长</div>
              <div class="overview-item-value">${data.duration}</div>
            </div>
            <div class="overview-item">
              <div class="overview-item-label">机柜总数</div>
              <div class="overview-item-value">${data.totalRacks} 台</div>
            </div>
            <div class="overview-item">
              <div class="overview-item-label">空调风口</div>
              <div class="overview-item-value">${data.totalVents} 个</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">
          <svg class="section-title-icon text-orange" style="color:#ea580c;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          二、告警详情及处理建议
        </h2>
        <div>
          ${alarmCardsHtml}
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">
          <svg class="section-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          三、3D可视化监控说明
        </h2>
        <div class="section-content">
          <p class="overview-text">
            本系统采用 Three.js + React Three Fiber 技术栈实现数据中心3D可视化监控，
            主要功能包括：
          </p>
          <ul class="features-list">
            <li><span class="feature-highlight">实时3D展示</span>：支持旋转、缩放、平移操作</li>
            <li><span class="feature-highlight">温场可视化</span>：以色温图形式展示各区域温度分布</li>
            <li><span class="feature-highlight">告警联动</span>：点击告警自动定位至相关设备</li>
            <li><span class="feature-highlight">多线索归并</span>：自动关联机柜、风口、桥架到同一事件</li>
            <li><span class="feature-highlight">一键截图</span>：支持3D场景截图导出</li>
            <li><span class="feature-highlight">筛选同步</span>：3D视图与侧边栏筛选条件实时同步</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">
          <svg class="section-title-icon text-green" style="color:#16a34a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          四、巡检结论
        </h2>
        <div class="conclusion">
          <p class="conclusion-text">
            本次巡检发现 <strong style="color:#dc2626;">${data.criticalCount} 处严重问题</strong>，
            <strong style="color:#ea580c;"> ${data.warningCount} 处警告问题</strong>。
            建议优先处理严重告警，确保数据中心安全稳定运行。
          </p>
        </div>
      </div>
    </div>
    <div class="footer">
      <div>巡检员: 系统自动生成</div>
      <div>报告版本: v1.0</div>
    </div>
  </div>
</body>
</html>`;
}

export async function exportReport(): Promise<{ success: boolean; filename: string; error?: string }> {
  try {
    const data = generateReportData();
    const html = generateReportHtml(data);

    if (!html || html.length < 100) {
      return { success: false, filename: '', error: '报告内容生成失败：内容过短' };
    }

    const timestamp = `${data.generatedAt.getFullYear()}${String(data.generatedAt.getMonth() + 1).padStart(2, '0')}${String(data.generatedAt.getDate()).padStart(2, '0')}-${String(data.generatedAt.getHours()).padStart(2, '0')}${String(data.generatedAt.getMinutes()).padStart(2, '0')}`;
    const filename = `数据中心巡检报告-${timestamp}.html`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return { success: true, filename };
  } catch (error) {
    console.error('报告导出失败:', error);
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
