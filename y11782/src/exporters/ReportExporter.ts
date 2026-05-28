import { CheckReport, Course, Anomaly } from '../models/types';
import { PathExplainer } from '../utils/PathExplainer';

export class ReportExporter {
  private report: CheckReport;
  private explainer: PathExplainer;

  constructor(report: CheckReport) {
    this.report = report;
    this.explainer = new PathExplainer(
      report.dataSnapshot.courses,
      report.dataSnapshot.prerequisites,
      report.dataSnapshot.alternativeCourses
    );
  }

  exportToJSON(): string {
    return JSON.stringify(this.report, null, 2);
  }

  exportToHTML(): string {
    const css = this.getStyles();
    const summary = this.renderSummary();
    const topology = this.renderTopology();
    const anomalies = this.renderAnomalies();
    const recommendations = this.renderRecommendations();
    const dataSource = this.renderDataSource();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>课程先修关系检查报告</title>
    ${css}
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🎓 课程先修关系检查报告</h1>
            <div class="meta">
                <span class="badge">报告ID: ${this.report.id}</span>
                <span class="badge">生成时间: ${new Date(this.report.createdAt).toLocaleString('zh-CN')}</span>
                <span class="badge">数据源: ${this.report.dataSource}</span>
            </div>
        </header>

        ${summary}
        ${topology}
        ${anomalies}
        ${recommendations}
        ${dataSource}

        <footer class="footer">
            <p>课程先修图检查CLI工具 © ${new Date().getFullYear()} | 教务系统团队</p>
        </footer>
    </div>
</body>
</html>`;
  }

  private getStyles(): string {
    return `<style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .header h1 {
            color: #4a5568;
            font-size: 28px;
            margin-bottom: 15px;
        }

        .meta {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .badge {
            background: #e2e8f0;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            color: #4a5568;
        }

        .section {
            background: white;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .section h2 {
            color: #2d3748;
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }

        .summary-card.error {
            background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
        }

        .summary-card.warning {
            background: linear-gradient(135deg, #ed8936 0%, #c05621 100%);
        }

        .summary-card.success {
            background: linear-gradient(135deg, #48bb78 0%, #276749 100%);
        }

        .summary-card .number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .summary-card .label {
            font-size: 14px;
            opacity: 0.9;
        }

        .topology-order {
            background: #f7fafc;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
        }

        .course-chain {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }

        .course-node {
            background: #4299e1;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            white-space: nowrap;
        }

        .course-node.cycle {
            background: #f56565;
            animation: pulse 2s infinite;
        }

        .arrow {
            color: #a0aec0;
            font-weight: bold;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .anomaly-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .anomaly-card {
            border-left: 4px solid;
            padding: 15px;
            border-radius: 8px;
            background: #f7fafc;
        }

        .anomaly-card.error {
            border-color: #f56565;
            background: #fff5f5;
        }

        .anomaly-card.warning {
            border-color: #ed8936;
            background: #fffaf0;
        }

        .anomaly-card.info {
            border-color: #4299e1;
            background: #ebf8ff;
        }

        .anomaly-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .anomaly-title {
            font-weight: bold;
            font-size: 16px;
            color: #2d3748;
        }

        .anomaly-severity {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .anomaly-severity.error {
            background: #fed7d7;
            color: #c53030;
        }

        .anomaly-severity.warning {
            background: #feebc8;
            color: #c05621;
        }

        .anomaly-severity.info {
            background: #bee3f8;
            color: #2b6cb0;
        }

        .anomaly-description {
            color: #4a5568;
            margin-bottom: 10px;
            line-height: 1.6;
        }

        .anomaly-path {
            background: rgba(0,0,0,0.05);
            padding: 10px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            margin-top: 10px;
        }

        .anomaly-details {
            margin-top: 10px;
            font-size: 13px;
            color: #718096;
        }

        .anomaly-source {
            display: inline-block;
            background: #e2e8f0;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 8px;
        }

        .recommendations-list {
            list-style: none;
        }

        .recommendations-list li {
            padding: 12px 15px;
            margin-bottom: 8px;
            background: #f0fff4;
            border-left: 4px solid #48bb78;
            border-radius: 6px;
            color: #276749;
        }

        .data-source-section {
            font-size: 13px;
            color: #718096;
        }

        .data-source-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .data-source-table th,
        .data-source-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        .data-source-table th {
            background: #f7fafc;
            font-weight: 600;
        }

        .footer {
            text-align: center;
            color: white;
            padding: 20px;
            opacity: 0.9;
            font-size: 14px;
        }

        .collapsible {
            cursor: pointer;
            user-select: none;
        }

        .collapsible::after {
            content: ' ▼';
            font-size: 12px;
        }

        .collapsible.open::after {
            content: ' ▲';
        }

        .collapsible-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }

        .collapsible-content.open {
            max-height: 2000px;
        }

        .cycle-path {
            background: #fff5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 10px 0;
        }

        .cycle-path h4 {
            color: #c53030;
            margin-bottom: 10px;
        }

        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }

        .detail-item {
            background: white;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }

        .detail-label {
            font-size: 12px;
            color: #718096;
            margin-bottom: 4px;
        }

        .detail-value {
            font-size: 14px;
            font-weight: 600;
            color: #2d3748;
        }
    </style>`;
  }

  private renderSummary(): string {
    const { summary } = this.report;
    const hasErrors = summary.anomaliesCount > 0;

    return `<section class="section">
            <h2>📊 检查概览</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="number">${summary.totalCourses}</div>
                    <div class="label">课程总数</div>
                </div>
                <div class="summary-card">
                    <div class="number">${summary.totalPrerequisites}</div>
                    <div class="label">先修关系</div>
                </div>
                <div class="summary-card ${hasErrors ? 'error' : 'success'}">
                    <div class="number">${summary.anomaliesCount}</div>
                    <div class="label">异常总数</div>
                </div>
                <div class="summary-card ${summary.cyclesCount > 0 ? 'error' : 'success'}">
                    <div class="number">${summary.cyclesCount}</div>
                    <div class="label">循环依赖</div>
                </div>
                <div class="summary-card ${summary.conflictsCount > 0 ? 'warning' : 'success'}">
                    <div class="number">${summary.conflictsCount}</div>
                    <div class="label">替代课冲突</div>
                </div>
                <div class="summary-card ${summary.overloadsCount > 0 ? 'warning' : 'success'}">
                    <div class="number">${summary.overloadsCount}</div>
                    <div class="label">学期超载</div>
                </div>
            </div>
        </section>`;
  }

  private renderTopology(): string {
    const { topology, dataSnapshot } = this.report;
    const courseMap = new Map(dataSnapshot.courses.map(c => [c.id, c]));
    const cycleCourses = new Set<string>();
    topology.cycles.forEach(cycle => cycle.forEach(c => cycleCourses.add(c)));

    const orderHTML = topology.order.length > 0
      ? `<div class="course-chain">
            ${topology.order.map((id, index) => {
              const course = courseMap.get(id);
              const name = course ? course.name : id;
              const isCycle = cycleCourses.has(id);
              return `${index > 0 ? '<span class="arrow">→</span>' : ''}<span class="course-node ${isCycle ? 'cycle' : ''}" title="${id}">${name}</span>`;
            }).join('')}
        </div>`
      : '<p style="color: #718096;">由于存在循环依赖，无法生成完整的拓扑排序。</p>';

    const cyclesHTML = topology.cycles.length > 0
      ? `<div style="margin-top: 20px;">
            <h3 style="color: #c53030; margin-bottom: 15px;">🔴 检测到的循环</h3>
            ${topology.cycles.map((cycle, index) => {
              const names = cycle.map(id => {
                const course = courseMap.get(id);
                return course ? `${course.name} (${id})` : id;
              });
              return `<div class="cycle-path">
                    <h4>循环 #${index + 1} (${cycle.length - 1} 门课程)</h4>
                    <div class="course-chain">
                        ${names.map((name, i) => `${i > 0 ? '<span class="arrow">→</span>' : ''}<span class="course-node cycle">${name}</span>`).join('')}
                    </div>
                </div>`;
            }).join('')}
        </div>`
      : '';

    return `<section class="section">
            <h2>🔗 拓扑排序结果</h2>
            <div class="topology-order">
                ${orderHTML}
            </div>
            ${cyclesHTML}
        </section>`;
  }

  private renderAnomalies(): string {
    const { anomalies } = this.report;

    if (anomalies.length === 0) {
      return `<section class="section">
            <h2>✅ 异常检测</h2>
            <div style="padding: 20px; background: #f0fff4; border-radius: 8px; text-align: center; color: #276749;">
                <strong>🎉 恭喜！未检测到任何异常</strong>
                <p style="margin-top: 10px;">课程先修关系设置正确，可以放心排课。</p>
            </div>
        </section>`;
    }

    const anomaliesByType: Record<string, Anomaly[]> = {
      cycle: [],
      alternative_conflict: [],
      semester_overload: [],
    };

    anomalies.forEach(a => {
      if (anomaliesByType[a.type]) {
        anomaliesByType[a.type].push(a);
      }
    });

    const typeNames: Record<string, string> = {
      cycle: '🔴 循环依赖',
      alternative_conflict: '🟠 替代课程冲突',
      semester_overload: '🟡 学期超载/冲突',
    };

    let html = '';
    for (const [type, list] of Object.entries(anomaliesByType)) {
      if (list.length > 0) {
        html += `<div style="margin-bottom: 25px;">
                <h3 style="color: #4a5568; margin-bottom: 15px;">${typeNames[type]} (${list.length} 项)</h3>
                <div class="anomaly-list">
                    ${list.map((a, index) => this.renderAnomalyCard(a, index)).join('')}
                </div>
            </div>`;
      }
    }

    return `<section class="section">
            <h2>⚠️ 异常检测 (${anomalies.length} 项)</h2>
            ${html}
        </section>`;
  }

  private renderAnomalyCard(anomaly: Anomaly, index: number): string {
    const courseMap = new Map(this.report.dataSnapshot.courses.map(c => [c.id, c]));

    let pathHTML = '';
    if (anomaly.path && anomaly.path.length > 1) {
      const pathNames = anomaly.path.map(id => {
        const course = courseMap.get(id);
        return course ? `${course.name} (${id})` : id;
      });
      pathHTML = `<div class="anomaly-path">
                <strong>问题路径：</strong><br>
                ${pathNames.join(' → ')}
            </div>`;
    }

    let detailsHTML = '';
    if (anomaly.details && Object.keys(anomaly.details).length > 0) {
      const details: { label: string; value: string }[] = [];

      if (anomaly.details.totalCredits !== undefined) {
        details.push({ label: '计划学分', value: String(anomaly.details.totalCredits) });
        details.push({ label: '学分上限', value: String(anomaly.details.maxCredits) });
        details.push({ label: '超出学分', value: String(anomaly.details.exceededBy) });
      }
      if (anomaly.details.courseCount !== undefined) {
        details.push({ label: '课程数量', value: String(anomaly.details.courseCount) });
        details.push({ label: '建议上限', value: String(anomaly.details.maxRecommended) });
      }
      if (anomaly.details.conflictType) {
        details.push({ label: '冲突类型', value: String(anomaly.details.conflictType) });
      }
      if (anomaly.details.overloadType) {
        details.push({ label: '超载类型', value: String(anomaly.details.overloadType) });
      }
      if (anomaly.details.semester !== undefined) {
        details.push({ label: '学期', value: `第${anomaly.details.semester}学期` });
      }
      if (anomaly.details.studentGrade !== undefined) {
        details.push({ label: '年级', value: `${anomaly.details.studentGrade}年级` });
      }

      if (details.length > 0) {
        detailsHTML = `<div class="details-grid">
                    ${details.map(d => `<div class="detail-item">
                        <div class="detail-label">${d.label}</div>
                        <div class="detail-value">${d.value}</div>
                    </div>`).join('')}
                </div>`;
      }
    }

    const involvedHTML = anomaly.involvedCourses.length > 0
      ? `<div style="margin-top: 10px;">
                <strong>涉及课程：</strong>
                ${anomaly.involvedCourses.map(id => {
                  const course = courseMap.get(id);
                  return `<span class="course-node" style="margin: 3px; display: inline-block;">${course ? course.name : id}</span>`;
                }).join('')}
            </div>`
      : '';

    return `<div class="anomaly-card ${anomaly.severity}">
            <div class="anomaly-header">
                <span class="anomaly-title">#${index + 1} ${anomaly.title}</span>
                <span class="anomaly-severity ${anomaly.severity}">${this.getSeverityText(anomaly.severity)}</span>
            </div>
            <div class="anomaly-description">${anomaly.description}</div>
            ${pathHTML}
            ${involvedHTML}
            ${detailsHTML}
            <span class="anomaly-source">📌 来源: ${anomaly.source}</span>
        </div>`;
  }

  private renderRecommendations(): string {
    const { recommendations } = this.report;

    return `<section class="section">
            <h2>💡 建议措施</h2>
            <ul class="recommendations-list">
                ${recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
        </section>`;
  }

  private renderDataSource(): string {
    const { dataSnapshot } = this.report;

    return `<section class="section">
            <h2>📁 数据来源明细</h2>
            <div class="data-source-section">
                <h3 class="collapsible" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')">
                    课程清单 (${dataSnapshot.courses.length} 门)
                </h3>
                <div class="collapsible-content">
                    <table class="data-source-table">
                        <thead>
                            <tr>
                                <th>课程ID</th>
                                <th>课程名称</th>
                                <th>学分</th>
                                <th>开课学院</th>
                                <th>建议学期</th>
                                <th>数据来源</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataSnapshot.courses.map(c => `<tr>
                                <td><code>${c.id}</code></td>
                                <td>${c.name}</td>
                                <td>${c.credits}</td>
                                <td>${c.department}</td>
                                <td>${c.semester ? `第${c.semester}学期` : '-'}</td>
                                <td>${c.source}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>

                <h3 class="collapsible" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')" style="margin-top: 20px;">
                    先修关系 (${dataSnapshot.prerequisites.length} 条)
                </h3>
                <div class="collapsible-content">
                    <table class="data-source-table">
                        <thead>
                            <tr>
                                <th>先修课</th>
                                <th></th>
                                <th>后续课</th>
                                <th>类型</th>
                                <th>数据来源</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataSnapshot.prerequisites.map(p => {
                              const pre = dataSnapshot.courses.find(c => c.id === p.prerequisiteId);
                              const post = dataSnapshot.courses.find(c => c.id === p.courseId);
                              return `<tr>
                                <td>${pre ? pre.name : p.prerequisiteId} <code>(${p.prerequisiteId})</code></td>
                                <td>→</td>
                                <td>${post ? post.name : p.courseId} <code>(${p.courseId})</code></td>
                                <td>${p.type === 'required' ? '必修先修' : '共修'}</td>
                                <td>${p.source}</td>
                              </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <h3 class="collapsible" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')" style="margin-top: 20px;">
                    学期计划 (${dataSnapshot.semesterPlans.length} 个)
                </h3>
                <div class="collapsible-content">
                    ${dataSnapshot.semesterPlans.map(plan => {
                      const totalCredits = plan.courses.reduce((sum, cid) => {
                        const c = dataSnapshot.courses.find(c => c.id === cid);
                        return sum + (c?.credits || 0);
                      }, 0);
                      return `<div style="margin-bottom: 15px; padding: 15px; background: #f7fafc; border-radius: 8px;">
                        <h4>${plan.studentGrade}年级 第${plan.semester}学期 (学分上限: ${plan.maxCredits}, 计划: ${totalCredits})</h4>
                        <div style="margin-top: 10px;">
                            ${plan.courses.map(cid => {
                              const c = dataSnapshot.courses.find(c => c.id === cid);
                              return `<span class="course-node" style="margin: 3px; display: inline-block;">${c ? c.name : cid} (${c?.credits || 0}学分)</span>`;
                            }).join('')}
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #718096;">来源: ${plan.source}</div>
                      </div>`;
                    }).join('')}
                </div>

                <h3 class="collapsible" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')" style="margin-top: 20px;">
                    替代课程 (${dataSnapshot.alternativeCourses.length} 条)
                </h3>
                <div class="collapsible-content">
                    <table class="data-source-table">
                        <thead>
                            <tr>
                                <th>原课程</th>
                                <th></th>
                                <th>替代课程</th>
                                <th>原因</th>
                                <th>生效时间</th>
                                <th>数据来源</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataSnapshot.alternativeCourses.map(a => {
                              const orig = dataSnapshot.courses.find(c => c.id === a.originalId);
                              const alt = dataSnapshot.courses.find(c => c.id === a.alternativeId);
                              return `<tr>
                                <td>${orig ? orig.name : a.originalId} <code>(${a.originalId})</code></td>
                                <td>⇄</td>
                                <td>${alt ? alt.name : a.alternativeId} <code>(${a.alternativeId})</code></td>
                                <td>${a.reason}</td>
                                <td>${a.effectiveFrom}</td>
                                <td>${a.source}</td>
                              </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <h3 class="collapsible" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')" style="margin-top: 20px;">
                    学生信息 (${dataSnapshot.studentGrades.length} 人)
                </h3>
                <div class="collapsible-content">
                    <table class="data-source-table">
                        <thead>
                            <tr>
                                <th>学号</th>
                                <th>姓名</th>
                                <th>年级</th>
                                <th>已修课程</th>
                                <th>数据来源</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataSnapshot.studentGrades.map(s => `<tr>
                                <td><code>${s.id}</code></td>
                                <td>${s.name}</td>
                                <td>${s.gradeLevel}年级</td>
                                <td>${s.completedCourses.length > 0 ? s.completedCourses.join(', ') : '-'}</td>
                                <td>${s.source}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>`;
  }

  private getSeverityText(severity: Anomaly['severity']): string {
    const map: Record<Anomaly['severity'], string> = {
      error: '错误',
      warning: '警告',
      info: '提示',
    };
    return map[severity];
  }

  exportToText(): string {
    const { report } = this;
    const courseMap = new Map(report.dataSnapshot.courses.map(c => [c.id, c]));

    let output = '';
    output += '='.repeat(70) + '\n';
    output += '           课程先修关系检查报告\n';
    output += '='.repeat(70) + '\n\n';
    output += `报告ID: ${report.id}\n`;
    output += `生成时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}\n`;
    output += `数据源: ${report.dataSource}\n\n`;

    output += '-'.repeat(70) + '\n';
    output += '【检查概览】\n';
    output += '-'.repeat(70) + '\n';
    output += `  课程总数: ${report.summary.totalCourses}\n`;
    output += `  先修关系: ${report.summary.totalPrerequisites}\n`;
    output += `  异常总数: ${report.summary.anomaliesCount}\n`;
    output += `  循环依赖: ${report.summary.cyclesCount}\n`;
    output += `  替代课冲突: ${report.summary.conflictsCount}\n`;
    output += `  学期超载: ${report.summary.overloadsCount}\n\n`;

    output += '-'.repeat(70) + '\n';
    output += '【拓扑排序结果】\n';
    output += '-'.repeat(70) + '\n';

    if (report.topology.order.length > 0) {
      const orderNames = report.topology.order.map(id => {
        const c = courseMap.get(id);
        return c ? c.name : id;
      });
      output += `  ${orderNames.join(' → ')}\n\n`;
    } else {
      output += `  由于存在循环依赖，无法生成完整的拓扑排序。\n\n`;
    }

    if (report.topology.cycles.length > 0) {
      output += '  检测到的循环:\n';
      report.topology.cycles.forEach((cycle, index) => {
        const names = cycle.map(id => {
          const c = courseMap.get(id);
          return c ? c.name : id;
        });
        output += `    #${index + 1}: ${names.join(' → ')}\n`;
      });
      output += '\n';
    }

    if (report.anomalies.length > 0) {
      output += '-'.repeat(70) + '\n';
      output += '【异常详情】\n';
      output += '-'.repeat(70) + '\n\n';

      report.anomalies.forEach((anomaly, index) => {
        output += this.explainer.explainAnomaly(anomaly) + '\n\n';
      });
    }

    output += '-'.repeat(70) + '\n';
    output += '【建议措施】\n';
    output += '-'.repeat(70) + '\n';
    report.recommendations.forEach((r, i) => {
      output += `  ${i + 1}. ${r}\n`;
    });
    output += '\n';

    output += '='.repeat(70) + '\n';
    output += '  报告结束\n';
    output += '='.repeat(70) + '\n';

    return output;
  }
}
