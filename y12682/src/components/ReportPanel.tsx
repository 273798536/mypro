import React, { useState } from 'react';
import { useLevelStore, useAnomalyStore, useRecordStore, useTopologyStore, useTimelineStore } from '../store';

const ReportPanel: React.FC = () => {
  const { levels, settlements } = useLevelStore();
  const { anomalies } = useAnomalyStore();
  const { processRecords } = useRecordStore();
  const { nodes, links } = useTopologyStore();
  const { syncRecords } = useTimelineStore();
  const [reportContent, setReportContent] = useState('');
  const [plainTextReport, setPlainTextReport] = useState('');
  const [activeTab, setActiveTab] = useState<'plain' | 'technical'>('plain');

  const generatePlainTextReport = () => {
    const totalRecords = processRecords.length;
    const openAnomalies = anomalies.filter(a => a.status !== 'resolved');
    const resolvedAnomalies = anomalies.filter(a => a.status === 'resolved');
    const latestSettlement = settlements[settlements.length - 1];
    const completedLevels = levels.filter(l => l.status === 'completed').length;
    const failedLevels = levels.filter(l => l.status === 'failed').length;
    const syncReviews = syncRecords.filter(r => r.review).length;
    
    const lines = [
      `各位同事：`,
      ``,
      `这是本次数据库分片拓扑星图的工程评审结果，用大白话说明如下：`,
      ``,
      `一、整体情况`,
      `我们一共检查了 ${nodes.length} 个数据库节点和 ${links.length} 条连接，`,
      `走完了 ${completedLevels} 个评审关卡${failedLevels > 0 ? `，其中 ${failedLevels} 个关卡未通过` : ''}。`,
      `全程记录了 ${totalRecords} 条操作日志，保证每一步改动都有迹可循。`,
      ``,
      `二、发现的问题（说人话版）`,
    ];

    if (openAnomalies.length > 0) {
      const coordMix = openAnomalies.filter(a => a.type === 'coordinate_mix').length;
      const boundaryFail = openAnomalies.filter(a => a.type === 'boundary_failure').length;
      
      if (coordMix > 0) {
        lines.push(`• 坐标系混用问题（${coordMix}处）：有些节点用的是像素(px)，有些用的是英寸(inch)或厘米(cm)，`);
        lines.push(`  就像一张图上同时用了米和寸来标距离，会导致位置计算出错。`);
      }
      if (boundaryFail > 0) {
        lines.push(`• 边界连接失败（${boundaryFail}处）：跨分片的事务连接带宽不够、延迟太高，`);
        lines.push(`  就像两个部门之间打电话总是掉线、信号差，数据传不过去。`);
      }
      if (coordMix === 0 && boundaryFail === 0) {
        lines.push(`• 还有 ${openAnomalies.length} 个待处理的其他异常问题。`);
      }
    } else {
      lines.push(`目前没有发现未解决的异常问题。`);
    }

    lines.push(``);
    lines.push(`三、已处理的问题`);
    if (resolvedAnomalies.length > 0) {
      lines.push(`已有 ${resolvedAnomalies.length} 个异常问题完成处理并记录了处理意见。`);
    } else {
      lines.push(`暂时没有已关闭的问题，以上问题都需要跟进。`);
    }

    lines.push(``);
    lines.push(`四、时间轴同步审核`);
    if (syncReviews > 0) {
      lines.push(`已有 ${syncReviews} 次时间轴同步操作经过了工程评审员复核，`);
      lines.push(`每条记录都注明了"谁改的、什么时候改的、为什么改"，历史可追溯。`);
    } else {
      lines.push(`目前暂无复核记录。`);
    }

    lines.push(``);
    lines.push(`五、接下来要做的事`);
    lines.push(`1. 把所有节点的坐标系和单位统一，建议都用像素(px)`);
    lines.push(`2. 升级边界节点的带宽，把延迟降下来`);
    lines.push(`3. 给每个待处理的异常填写处理意见和责任人`);
    lines.push(`4. 修复完成后重新跑一遍评审流程验证`);
    
    if (latestSettlement) {
      lines.push(``);
      lines.push(`六、评审得分`);
      lines.push(`本次综合得分：${latestSettlement.score} 分（满分100分），`);
      lines.push(`结论：${latestSettlement.passed ? '通过，建议持续优化' : '暂未通过，需要修复后复审'}。`);
    }

    lines.push(``);
    lines.push(`以上内容可直接转发，不用重新翻译。`);
    lines.push(`如有疑问随时联系工程评审组。`);
    lines.push(``);
    lines.push(`—— 工程评审员`);
    lines.push(`${new Date().toLocaleDateString('zh-CN')}`);
    
    return lines.join('\n');
  };

  const generateTechnicalReport = () => {
    const totalRecords = processRecords.length;
    const openAnomalies = anomalies.filter(a => a.status !== 'resolved').length;
    const latestSettlement = settlements[settlements.length - 1];
    
    const lines = [
      `# 数据库分片拓扑星图评审报告`,
      ``,
      `## 评审信息`,
      `- 评审日期：${new Date().toLocaleDateString('zh-CN')}`,
      `- 评审版本：v1.0`,
      `- 评审员：工程评审员`,
      ``,
      `## 拓扑概况`,
      `- 节点总数：${nodes.length}`,
      `- 连接总数：${links.length}`,
      `- 关卡进度：${levels.filter(l => l.status === 'completed').length}/${levels.length}`,
      ``,
      `## 异常统计`,
      `- 待处理异常：${openAnomalies}`,
      `- 已解决异常：${anomalies.length - openAnomalies}`,
      `- 处理记录：${totalRecords}`,
      ``,
      `## 评审结论`,
      latestSettlement?.passed 
        ? `✓ 评审通过（得分：${latestSettlement.score}）`
        : `✗ 评审未通过（得分：${latestSettlement?.score || 0}）`,
      ``,
      `## 主要发现`,
      ...(latestSettlement?.problems || []).map(p => `- ${p}`),
      ``,
      `## 改进建议`,
      ...(latestSettlement?.suggestions || []).map(s => `- ${s}`),
      ``,
      `## 时间轴同步记录`,
      `- 总同步记录：${syncRecords.length}`,
      `- 已复核：${syncRecords.filter(r => r.review).length}`,
      `- 待复核：${syncRecords.filter(r => r.status === 'pending').length}`,
      ``,
      `## 三维模型关联`,
      `- 关联3D模型的节点：${nodes.filter(n => n.modelUrl).length}`,
      `- 关联3D模型的异常：${anomalies.filter(a => a.context.modelUrl).length}`,
    ];

    return lines.join('\n');
  };

  const handleGenerateReport = () => {
    const technical = generateTechnicalReport();
    const plain = generatePlainTextReport();
    setReportContent(technical);
    setPlainTextReport(plain);
  };

  const handleCopyReport = (content: string, label: string) => {
    if (content) {
      navigator.clipboard.writeText(content);
      alert(`${label}已复制到剪贴板！`);
    }
  };

  return (
    <div style={{ padding: '16px', overflow: 'auto', height: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          📄 报告生成
        </h3>
        <button 
          className="btn btn-primary"
          onClick={handleGenerateReport}
          style={{ width: '100%' }}
        >
          🔄 生成评审报告
        </button>
      </div>

      {reportContent && plainTextReport && (
        <>
          <div className="tabs" style={{ marginBottom: '12px' }}>
            <button 
              className={`tab ${activeTab === 'plain' ? 'active' : ''}`}
              onClick={() => setActiveTab('plain')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              🗣️ 普通话版
            </button>
            <button 
              className={`tab ${activeTab === 'technical' ? 'active' : ''}`}
              onClick={() => setActiveTab('technical')}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              🔧 技术详情
            </button>
          </div>

          {activeTab === 'plain' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--color-text-secondary)', 
                marginBottom: '8px',
                padding: '8px',
                background: '#DBEAFE',
                borderRadius: 'var(--radius-sm)',
                borderLeft: '3px solid var(--color-primary)',
              }}>
                ✅ <b>普通话解释</b>：以下内容用大白话写的，可直接复制给同事，不用重新翻译
              </div>
              <textarea
                value={plainTextReport}
                onChange={(e) => setPlainTextReport(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '350px',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  lineHeight: '1.8',
                  padding: '12px',
                  border: '2px dashed var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                  background: '#EFF6FF',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleCopyReport(plainTextReport, '普通话解释报告')}
                  style={{ flex: 1 }}
                >
                  📋 复制给同事
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                  style={{ flex: 1 }}
                >
                  🖨️ 打印
                </button>
              </div>
            </div>
          )}

          {activeTab === 'technical' && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--color-text-secondary)', 
                marginBottom: '8px',
                padding: '8px',
                background: 'var(--color-background)',
                borderRadius: 'var(--radius-sm)',
              }}>
                🔧 技术详情报告：面向技术人员的详细报告
              </div>
              <textarea
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '350px',
                  fontFamily: 'Monaco, Menlo, monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  padding: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleCopyReport(reportContent, '技术报告')}
                  style={{ flex: 1 }}
                >
                  📋 复制技术报告
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                  style={{ flex: 1 }}
                >
                  🖨️ 打印
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
          📊 快速统计
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-primary)' }}>
              {nodes.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>节点</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-success)' }}>
              {links.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>连接</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-warning)' }}>
              {anomalies.filter(a => a.status !== 'resolved').length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>待处理</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text)' }}>
              {processRecords.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>记录</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#8B5CF6' }}>
              {syncRecords.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>同步记录</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#0EA5E9' }}>
              {levels.filter(l => l.status === 'completed').length}/{levels.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>关卡进度</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPanel;
