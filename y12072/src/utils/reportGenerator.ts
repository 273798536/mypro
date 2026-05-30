import type { ResearchConclusion, Issue, RecordingSegment, SpacePoint3D, SavedView } from '../types';
import { ISSUE_TYPE_LABELS, QUALITY_LABELS } from '../types';
import { formatTime, formatFrequency } from './dataMapper';

export interface ReportData {
  conclusions: ResearchConclusion[];
  issues: Issue[];
  segments: RecordingSegment[];
  points: SpacePoint3D[];
  savedViews: SavedView[];
  dataVersion: string;
}

export function generateMarkdownReport(data: ReportData): string {
  const { conclusions, issues, segments, points, savedViews, dataVersion } = data;
  
  const lines: string[] = [];
  
  lines.push('# 古琴声腔空间分析报告');
  lines.push('');
  lines.push(`**生成时间**：${new Date().toLocaleString('zh-CN')}`);
  lines.push(`**数据版本**：${dataVersion}`);
  lines.push(`**分析片段数**：${segments.length}`);
  lines.push(`**3D空间点数**：${points.length}`);
  lines.push(`**待处理问题**：${issues.filter(i => i.status === 'pending').length}`);
  lines.push('');
  
  lines.push('## 1. 3D特征图生成说明');
  lines.push('');
  lines.push('### 1.1 空间映射算法');
  lines.push('');
  lines.push('本系统将古琴声腔数据从多维特征空间映射到三维可视化空间：');
  lines.push('');
  lines.push('- **X轴（指法维度）**：按指法类型（散音/按音/泛音等8类）离散映射到0-10区间');
  lines.push('- **Y轴（时间维度）**：将录音时间线性映射到0-100区间');
  lines.push('- **Z轴（频段维度）**：采用对数映射（20Hz-20kHz），符合人耳听觉特性');
  lines.push('- **点大小**：由频谱能量平均值决定，范围0.1-0.8');
  lines.push('- **点颜色**：按指法类型着色，便于分类识别');
  lines.push('');
  lines.push('### 1.2 数据来源');
  lines.push('');
  lines.push('| 数据类型 | 样本数 | 说明 |');
  lines.push('|---------|--------|------|');
  lines.push(`| 录音片段 | ${segments.length} | 总时长 ${formatTime(segments.reduce((a, s) => a + s.duration, 0))} |`);
  lines.push(`| 指法标注 | ${points.length} | 覆盖全部8种指法类型 |`);
  lines.push(`| 频谱特征 | ${points.length} | 每帧32个频段，含13维MFCC |`);
  lines.push('');
  
  lines.push('## 2. 数据质量评估');
  lines.push('');
  
  const qualityStats: Record<string, number> = {};
  segments.forEach(s => {
    qualityStats[s.quality] = (qualityStats[s.quality] || 0) + 1;
  });
  
  lines.push('### 2.1 片段质量分布');
  lines.push('');
  Object.entries(qualityStats).forEach(([quality, count]) => {
    lines.push(`- ${QUALITY_LABELS[quality as keyof typeof QUALITY_LABELS] || quality}：${count} 个片段`);
  });
  lines.push('');
  
  lines.push('### 2.2 问题清单');
  lines.push('');
  
  if (issues.length === 0) {
    lines.push('> 暂无数据质量问题');
  } else {
    lines.push('| 问题类型 | 严重程度 | 描述 | 处理人 | 状态 |');
    lines.push('|---------|----------|------|--------|------|');
    issues.forEach(issue => {
      lines.push(`| ${ISSUE_TYPE_LABELS[issue.type]} | ${issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'} | ${issue.description} | ${issue.assignee} | ${issue.status === 'pending' ? '待确认' : issue.status === 'confirmed' ? '已确认' : '已解决'} |`);
    });
  }
  lines.push('');
  
  lines.push('### 2.3 处理建议');
  lines.push('');
  issues.filter(i => i.status === 'pending').forEach(issue => {
    lines.push(`1. **${ISSUE_TYPE_LABELS[issue.type]}**（${issue.relatedSegmentIds.join(', ')}）：请 ${issue.assignee} 核对原始数据`);
  });
  lines.push('');
  
  lines.push('## 3. 研究结论');
  lines.push('');
  
  if (conclusions.length === 0) {
    lines.push('> 暂无研究结论，请在分析过程中添加结论');
  } else {
    conclusions.forEach((conclusion, idx) => {
      lines.push(`### 3.${idx + 1} ${conclusion.title}`);
      lines.push('');
      lines.push(conclusion.content);
      lines.push('');
      lines.push(`- **数据版本**：${conclusion.dataVersion}`);
      lines.push(`- **关联片段**：${conclusion.segmentIds.join(', ')}`);
      lines.push(`- **创建时间**：${new Date(conclusion.createdAt).toLocaleString('zh-CN')}`);
      lines.push(`- **更新时间**：${new Date(conclusion.updatedAt).toLocaleString('zh-CN')}`);
      lines.push('');
      
      if (conclusion.changeHistory.length > 0) {
        lines.push('**变更历史**：');
        lines.push('');
        conclusion.changeHistory.forEach(change => {
          lines.push(`- ${new Date(change.timestamp).toLocaleString('zh-CN')} - ${change.author} - ${change.description}`);
        });
        lines.push('');
      }
    });
  }
  
  lines.push('## 4. 保存的分析视角');
  lines.push('');
  
  if (savedViews.length === 0) {
    lines.push('> 暂无保存的视角');
  } else {
    lines.push('| 视角名称 | 创建时间 | 相机位置 | 关注目标 |');
    lines.push('|---------|----------|----------|----------|');
    savedViews.forEach(view => {
      const pos = view.cameraPosition.map(v => v.toFixed(1)).join(', ');
      const target = view.cameraTarget.map(v => v.toFixed(1)).join(', ');
      lines.push(`| ${view.name} | ${new Date(view.createdAt).toLocaleString('zh-CN')} | [${pos}] | [${target}] |`);
    });
  }
  lines.push('');
  
  lines.push('## 5. 频谱特征统计');
  lines.push('');
  
  if (points.length > 0) {
    const centroids = points.map(p => {
      const spectrum = data.points.find(sp => sp.id === p.id);
      return spectrum ? spectrum.z : 0;
    });
    const avgCentroid = centroids.reduce((a, b) => a + b, 0) / centroids.length;
    
    lines.push(`- **平均频谱质心**：${formatFrequency(avgCentroid * 2000)}`);
    lines.push(`- **指法类型分布**：${Object.entries(
      points.reduce((acc, p) => {
        acc[p.fingerType] = (acc[p.fingerType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([k, v]) => `${k}: ${v}`).join('、')}`);
  }
  lines.push('');
  
  lines.push('---');
  lines.push('*本报告由古琴声腔空间图分析系统自动生成*');
  
  return lines.join('\n');
}

export function downloadReport(markdown: string, filename: string = '古琴声腔分析报告.md'): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
