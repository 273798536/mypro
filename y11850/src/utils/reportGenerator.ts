import { DataPackage, ValidationResult, ShadowAnalysis, Season, ReviewItem, Building, Apartment } from '@/types';
import { getSeasonName, getSeasonDescription } from './sunCalculator';
import { formatTime } from './shadowDetector';

export interface ReportData {
  dataPackage: DataPackage;
  validationResult: ValidationResult;
  analysisResults: ShadowAnalysis[];
  reviewMarks: ReviewItem[];
  currentSeason: Season;
  generatedAt: number;
}

export function generateReportHTML(data: ReportData): string {
  const { dataPackage, validationResult, analysisResults, reviewMarks, currentSeason, generatedAt } = data;
  const generatedDate = new Date(generatedAt);
  
  const tzError = validationResult.errors.find(e => e.code.startsWith('TIMEZONE_'));
  const totalApartments = analysisResults.length;
  const avgSunlight = totalApartments > 0 
    ? (analysisResults.reduce((sum, a) => sum + a.totalSunlightHours, 0) / totalApartments).toFixed(1)
    : '0';
  const problemApartments = analysisResults.filter(a => a.needsReview).length;
  const pendingReviews = reviewMarks.filter(r => r.status === 'pending').length;
  
  const buildingsWithAnalysis = dataPackage.buildings.map(building => {
    const buildingAnalysis = analysisResults.filter(a => a.buildingId === building.id);
    return {
      building,
      analysis: buildingAnalysis,
      avgSunlight: buildingAnalysis.length > 0
        ? (buildingAnalysis.reduce((sum, a) => sum + a.totalSunlightHours, 0) / buildingAnalysis.length).toFixed(1)
        : '0',
    };
  });

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>日照分析报告 - ${dataPackage.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 3px solid #f97316; }
    .header h1 { font-size: 32px; color: #0f172a; margin-bottom: 10px; }
    .header .subtitle { color: #64748b; font-size: 16px; }
    .section { background: white; border-radius: 12px; padding: 30px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { font-size: 22px; color: #0f172a; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .summary-card { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; padding: 20px; text-align: center; }
    .summary-card .label { font-size: 14px; color: #64748b; margin-bottom: 8px; }
    .summary-card .value { font-size: 28px; font-weight: 700; color: #0ea5e9; }
    .summary-card.warning { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
    .summary-card.warning .value { color: #d97706; }
    .summary-card.danger { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); }
    .summary-card.danger .value { color: #dc2626; }
    .error-bubble { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin-bottom: 16px; }
    .error-bubble .title { font-weight: 600; color: #b91c1c; margin-bottom: 8px; font-size: 16px; }
    .error-bubble .message { color: #7f1d1d; line-height: 1.7; }
    .error-bubble .hint { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #fca5a5; color: #991b1b; font-size: 14px; }
    .success-bubble { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; border-radius: 8px; margin-bottom: 16px; }
    .success-bubble .title { font-weight: 600; color: #15803d; margin-bottom: 8px; font-size: 16px; }
    .success-bubble .message { color: #166534; line-height: 1.7; }
    .season-info { background: #fff7ed; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .season-info .season-name { font-size: 24px; font-weight: 700; color: #c2410c; margin-bottom: 8px; }
    .season-info .season-desc { color: #9a3412; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    tr:hover { background: #f8fafc; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .status-good { background: #dcfce7; color: #166534; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-bad { background: #fee2e2; color: #991b1b; }
    .review-item { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .review-item .type { font-weight: 600; color: #92400e; margin-bottom: 6px; }
    .review-item .desc { color: #78350f; }
    .review-item .status { margin-top: 8px; font-size: 13px; }
    .shadow-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .shadow-bar-fill { height: 100%; background: linear-gradient(90deg, #f97316 0%, #fbbf24 100%); }
    .footer { text-align: center; color: #94a3b8; font-size: 13px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .building-card { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .building-card h3 { color: #1e293b; margin-bottom: 12px; font-size: 18px; }
    .timeline { display: flex; align-items: center; gap: 4px; margin-top: 12px; }
    .timeline-slot { flex: 1; height: 24px; border-radius: 2px; }
    .timeline-slot.sunny { background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%); }
    .timeline-slot.shadow { background: linear-gradient(180deg, #64748b 0%, #475569 100%); }
    .timeline-slot.night { background: linear-gradient(180deg, #334155 0%, #1e293b 100%); }
    .timeline-labels { display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌞 城市天际线日照分析报告</h1>
      <p class="subtitle">${dataPackage.name} · ${getSeasonName(currentSeason)} · ${generatedDate.toLocaleDateString('zh-CN')}</p>
    </div>

    ${tzError ? `
    <div class="section">
      <h2>⚠️ 重要提示</h2>
      <div class="error-bubble">
        <div class="title">时区设置有误</div>
        <div class="message">${tzError.humanMessage}</div>
        <div class="hint">
          <strong>为什么这很重要？</strong><br>
          时区就像手表的指针，如果手表慢了8小时，你看到的"中午12点"其实是别人的早上4点，太阳的位置自然就不对了。
          这会导致所有的日出日落时间、日照时长计算都跟着出错。
        </div>
      </div>
    </div>
    ` : ''}

    ${!tzError ? `
    <div class="section">
      <h2>✅ 数据验证状态</h2>
      <div class="success-bubble">
        <div class="title">数据验证通过</div>
        <div class="message">时区、建筑、太阳路径等数据均已通过校验，可以放心查看分析结果。</div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>📊 总体概览</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">分析楼栋</div>
          <div class="value">${dataPackage.buildings.length}</div>
        </div>
        <div class="summary-card">
          <div class="label">住户总数</div>
          <div class="value">${totalApartments}</div>
        </div>
        <div class="summary-card">
          <div class="label">平均日照时长</div>
          <div class="value">${avgSunlight}h</div>
        </div>
        <div class="summary-card ${problemApartments > 0 ? 'warning' : ''}">
          <div class="label">需关注住户</div>
          <div class="value">${problemApartments}</div>
        </div>
        <div class="summary-card ${pendingReviews > 0 ? 'danger' : ''}">
          <div class="label">待人工复核</div>
          <div class="value">${pendingReviews}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🌤️ 当前分析季节</h2>
      <div class="season-info">
        <div class="season-name">${getSeasonName(currentSeason)}</div>
        <div class="season-desc">${getSeasonDescription(currentSeason)}</div>
      </div>
    </div>

    <div class="section">
      <h2>🏢 各楼栋日照情况</h2>
      ${buildingsWithAnalysis.map(({ building, analysis, avgSunlight }) => `
        <div class="building-card">
          <h3>${building.name}（${building.floors}层，${building.height}米）</h3>
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px; align-items: start;">
            <div>
              <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">平均日照</div>
              <div style="font-size: 32px; font-weight: 700; color: ${parseFloat(avgSunlight) >= 2 ? '#16a34a' : '#dc2626'};">${avgSunlight} 小时</div>
              <span class="status-badge ${parseFloat(avgSunlight) >= 2 ? 'status-good' : parseFloat(avgSunlight) >= 1 ? 'status-warning' : 'status-bad'}">
                ${parseFloat(avgSunlight) >= 2 ? '达标' : parseFloat(avgSunlight) >= 1 ? '偏低' : '不足'}
              </span>
            </div>
            <div>
              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">各户日照时长</div>
              ${analysis.slice(0, 5).map(apt => `
                <div style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13px;">
                    <span>${apt.apartmentId.includes('-') ? apt.apartmentId.split('-').pop() : apt.apartmentId}室</span>
                    <span style="color: ${apt.totalSunlightHours >= 2 ? '#16a34a' : '#dc2626'}; font-weight: 500;">${apt.totalSunlightHours}h</span>
                  </div>
                  <div class="shadow-bar">
                    <div class="shadow-bar-fill" style="width: ${Math.min(100, apt.totalSunlightHours / 8 * 100)}%;"></div>
                  </div>
                </div>
              `).join('')}
              ${analysis.length > 5 ? `<div style="font-size: 12px; color: #64748b; text-align: center;">... 还有 ${analysis.length - 5} 户</div>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    ${analysisResults.filter(a => a.needsReview).length > 0 ? `
    <div class="section">
      <h2>⚠️ 需要关注的住户</h2>
      <table>
        <thead>
          <tr>
            <th>楼栋</th>
            <th>房号</th>
            <th>日照时长</th>
            <th>状态</th>
            <th>问题说明</th>
          </tr>
        </thead>
        <tbody>
          ${analysisResults.filter(a => a.needsReview).map(apt => {
            const building = dataPackage.buildings.find(b => b.id === apt.buildingId);
            const apartment = building?.apartments.find(a => a.id === apt.apartmentId);
            return `
              <tr>
                <td>${building?.name || '未知'}</td>
                <td>${apartment?.unitNumber || apt.apartmentId}</td>
                <td><strong style="color: ${apt.totalSunlightHours >= 2 ? '#16a34a' : '#dc2626'};">${apt.totalSunlightHours}h</strong></td>
                <td><span class="status-badge ${apt.totalSunlightHours >= 2 ? 'status-warning' : 'status-bad'}">${apt.totalSunlightHours >= 2 ? '需复核' : '不达标'}</span></td>
                <td style="font-size: 13px; color: #64748b;">${apt.issues.join('；')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${reviewMarks.length > 0 ? `
    <div class="section">
      <h2>🔍 人工复核项</h2>
      ${reviewMarks.map(item => `
        <div class="review-item">
          <div class="type">${item.type === 'occlusion_miss' ? '遮挡漏算疑似' : item.type === 'floor_confusion' ? '楼层数据疑问' : '数据不一致'}</div>
          <div class="desc">${item.humanDescription}</div>
          <div class="status">
            <span class="status-badge ${item.status === 'confirmed' ? 'status-good' : item.status === 'resolved' ? 'status-warning' : 'status-bad'}">
              ${item.status === 'confirmed' ? '✓ 已确认' : item.status === 'resolved' ? '⚡ 已解决' : '⏳ 待处理'}
            </span>
            ${item.reviewerNote ? `<span style="margin-left: 12px; color: #64748b;">备注：${item.reviewerNote}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>本报告由「城市天际线日照盒」自动生成 | 生成时间：${generatedAt.toLocaleString('zh-CN')}</p>
      <p style="margin-top: 8px;">项目位置：${dataPackage.sunPath.latitude.toFixed(4)}°N, ${dataPackage.sunPath.longitude.toFixed(4)}°E | 时区：${dataPackage.timezone}</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

export function downloadReport(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getHumanReadableShadowAnalysis(analysis: ShadowAnalysis, building: Building, apartment: Apartment): string {
  const periods = analysis.shadowPeriods
    .filter(p => p.reason.includes('遮挡'))
    .map(p => `${formatTime(p.start)}至${formatTime(p.end)}，${p.reason}`)
    .join('；');
  
  if (analysis.totalSunlightHours >= 2) {
    return `${apartment.unitNumber}全天日照约${analysis.totalSunlightHours}小时，符合住宅日照标准。${periods ? '期间' + periods : ''}`;
  } else {
    return `${apartment.unitNumber}全天日照仅${analysis.totalSunlightHours}小时，低于2小时的住宅日照标准。${periods ? '主要原因：' + periods : ''}`;
  }
}
