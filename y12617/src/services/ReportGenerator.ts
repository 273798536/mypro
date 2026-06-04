import { generateId, ID_PREFIXES } from '../utils/id';
import { formatTime, formatDateTime } from '../utils/time';
import type { Annotation, AnnotationType } from '../types/annotation';
import type { CollisionEvent } from '../types/physics';
import type { Level } from '../types/level';
import type {
  Report,
  ReportStats,
  AnomalyItem,
  TraceNode,
  TraceNodeType,
} from '../types/report';

const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  boundary_error: '边界误判',
  collision_miss: '碰撞漏标',
  missing_unit: '单位缺失',
  duplicate: '重复标注',
  normal: '正常标注',
  other: '其他问题',
};

const ANNOTATION_TYPE_SEVERITY: Record<AnnotationType, 'low' | 'medium' | 'high'> = {
  boundary_error: 'high',
  collision_miss: 'high',
  missing_unit: 'low',
  duplicate: 'medium',
  normal: 'low',
  other: 'medium',
};

export class ReportGenerator {
  generate(level: Level, annotations: Annotation[], collisions: CollisionEvent[]): Report {
    const stats = this.generateStats(annotations, collisions);
    const anomalies = this.generateAnomalies(annotations);
    const plainTextExplanation = this.generatePlainTextExplanation(level, stats, anomalies);
    const traceChain = anomalies.length > 0 ? this.generateTraceChain(anomalies[0], annotations) : [];

    return {
      id: generateId(ID_PREFIXES.REPORT),
      levelId: level.id,
      levelName: level.name,
      generatedAt: Date.now(),
      stats,
      anomalies,
      annotations,
      plainTextExplanation,
      traceChain,
    };
  }

  generateStats(annotations: Annotation[], collisions: CollisionEvent[]): ReportStats {
    const anomalyTypes: AnnotationType[] = ['boundary_error', 'collision_miss', 'missing_unit', 'duplicate'];
    const anomalyAnnotations = annotations.filter(a => anomalyTypes.includes(a.type));
    const normalAnnotations = annotations.filter(a => a.type === 'normal');
    const draftAnnotations = annotations.filter(a => a.status === 'draft');
    const boundaryCollisions = collisions.filter(c => c.type === 'ball-wall');

    let avgAnnotationTime = 0;
    if (annotations.length >= 2) {
      const times = annotations.map(a => a.createdAt).sort();
      avgAnnotationTime = (times[times.length - 1] - times[0]) / annotations.length / 1000;
    }

    return {
      totalCollisions: collisions.length,
      boundaryCollisions: boundaryCollisions.length,
      anomalyCount: anomalyAnnotations.length,
      normalAnnotations: normalAnnotations.length,
      draftCount: draftAnnotations.length,
      avgAnnotationTime: Math.round(avgAnnotationTime * 100) / 100,
    };
  }

  generateAnomalies(annotations: Annotation[]): AnomalyItem[] {
    const anomalyTypes: AnnotationType[] = ['boundary_error', 'collision_miss', 'missing_unit', 'duplicate', 'other'];
    
    return annotations
      .filter(a => anomalyTypes.includes(a.type))
      .sort((a, b) => a.timePoint - b.timePoint)
      .map(annotation => ({
        id: generateId(ID_PREFIXES.ANOMALY),
        annotationId: annotation.id,
        type: annotation.type,
        timePoint: annotation.timePoint,
        description: ANNOTATION_TYPE_LABELS[annotation.type],
        severity: ANNOTATION_TYPE_SEVERITY[annotation.type],
        annotationContent: annotation.content,
        processNotes: [...annotation.processNotes],
      }));
  }

  generatePlainTextExplanation(level: Level, stats: ReportStats, anomalies: AnomalyItem[]): string {
    const now = formatDateTime(Date.now());
    const levelName = level.name;
    
    let explanation = `各位同事：\n\n`;
    explanation += `关于「${levelName}」的碰撞分析报告，生成时间：${now}\n\n`;
    
    explanation += `【基本情况】\n`;
    explanation += `本次模拟共检测到 ${stats.totalCollisions} 次碰撞事件，`;
    explanation += `其中边界碰撞 ${stats.boundaryCollisions} 次，`;
    explanation += `正常标注 ${stats.normalAnnotations} 条，`;
    explanation += `发现异常问题 ${stats.anomalyCount} 处。\n\n`;

    if (anomalies.length > 0) {
      explanation += `【异常详情】\n`;
      anomalies.forEach((anomaly, index) => {
        const timeStr = formatTime(anomaly.timePoint);
        const severity = anomaly.severity === 'high' ? '严重' : anomaly.severity === 'medium' ? '中等' : '轻微';
        explanation += `${index + 1}. [${timeStr}] ${anomaly.description}（${severity}）\n`;
        explanation += `   标注内容：${anomaly.annotationContent}\n`;
        
        if (anomaly.processNotes.length > 0) {
          explanation += `   处理意见：\n`;
          anomaly.processNotes.forEach(note => {
            explanation += `   - ${note.author}：${note.content}\n`;
          });
        }
        explanation += `\n`;
      });

      explanation += `【原因分析】\n`;
      const hasBoundaryError = anomalies.some(a => a.type === 'boundary_error');
      const hasCollisionMiss = anomalies.some(a => a.type === 'collision_miss');
      
      if (hasBoundaryError) {
        explanation += `• 边界误判可能是由于高速运动下的采样间隔不足导致，建议在关键区域增加采样频率。\n`;
      }
      if (hasCollisionMiss) {
        explanation += `• 碰撞漏标可能是由于标注人员注意力不集中或碰撞速度过快导致，建议增加自动标注辅助功能。\n`;
      }
      explanation += `• 其他问题建议加强标注人员培训，规范标注流程。\n\n`;

      explanation += `【处理建议】\n`;
      explanation += `1. 对于边界误判问题，建议复核原始画面，必要时进行人工修正。\n`;
      explanation += `2. 对于漏标问题，建议回放相关时间段，补充完整标注。\n`;
      explanation += `3. 对于重复标注，建议合并相同事件的标注，保持数据一致性。\n`;
      explanation += `4. 后续建议优化系统边界判定算法，减少误判概率。\n\n`;
    } else {
      explanation += `【整体评价】\n`;
      explanation += `本次标注工作完成质量良好，未发现明显异常问题。\n\n`;
    }

    explanation += `如有疑问，请随时沟通。\n\n`;
    explanation += `赛事运营组\n`;
    explanation += `${now}\n`;

    return explanation;
  }

  generateTraceChain(anomaly: AnomalyItem, annotations: Annotation[]): TraceNode[] {
    const annotation = annotations.find(a => a.id === anomaly.annotationId);
    if (!annotation) return [];

    const chain: TraceNode[] = [];

    chain.push(this.createTraceNode(
      'anomaly',
      anomaly.id,
      '异常报告',
      `${anomaly.description} - ${anomaly.annotationContent}`,
      anomaly.timePoint,
      anomaly.id
    ));

    chain.push(this.createTraceNode(
      'annotation',
      annotation.id,
      '标注记录',
      `[${formatTime(annotation.timePoint)}] ${annotation.content}`,
      annotation.createdAt,
      annotation.id
    ));

    chain.push(this.createTraceNode(
      'snapshot',
      annotation.snapshotId,
      '画布快照',
      `时间点 ${formatTime(annotation.timePoint)} 的球体位置状态`,
      annotation.createdAt,
      annotation.snapshotId
    ));

    annotation.processNotes.forEach(note => {
      chain.push(this.createTraceNode(
        'process_note',
        note.id,
        '处理意见',
        `${note.author}：${note.content}`,
        note.createdAt,
        note.id
      ));
    });

    return chain;
  }

  private createTraceNode(
    type: TraceNodeType,
    id: string,
    title: string,
    description: string,
    timestamp: number,
    linkId: string
  ): TraceNode {
    return {
      id,
      type,
      title,
      description,
      timestamp,
      linkId,
    };
  }
}
