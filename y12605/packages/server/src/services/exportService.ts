import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ReviewTask, ExportOptions, CONCLUSION_STATUS_LABELS, ANNOTATION_LABELS, USABILITY_LABELS, REVIEW_LEVELS } from '@puzzle/shared';
import { determineUsability, checkAllConsistencies } from './consistencyService';
import { validateTaskCompletion } from './validationService';

export async function exportToExcel(task: ReviewTask, options: ExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '儿童几何拼图课堂';
  workbook.created = new Date();
  
  const summarySheet = workbook.addWorksheet('审核摘要');
  summarySheet.columns = [
    { header: '项目', key: 'item', width: 25 },
    { header: '内容', key: 'value', width: 50 }
  ];
  
  const currentLevel = REVIEW_LEVELS.find(l => l.id === task.currentLevelId);
  const usability = determineUsability(task);
  
  summarySheet.addRow({ item: '任务标题', value: task.title });
  summarySheet.addRow({ item: '任务描述', value: task.description });
  summarySheet.addRow({ item: '当前关卡', value: currentLevel?.name || '未知' });
  summarySheet.addRow({ item: '负责人', value: task.assignee });
  summarySheet.addRow({ item: '审核状态', value: task.status });
  summarySheet.addRow({ item: '结论状态', value: task.conclusion ? CONCLUSION_STATUS_LABELS[task.conclusion.status] : '未填写' });
  summarySheet.addRow({ item: '可用性', value: USABILITY_LABELS[usability] });
  summarySheet.addRow({ item: '总分', value: `${task.scoreSheet.totalScore} / ${task.scoreSheet.maxTotalScore}` });
  summarySheet.addRow({ item: '完成时间', value: task.completedAt ? new Date(task.completedAt).toLocaleString('zh-CN') : '未完成' });
  summarySheet.addRow({ item: '导出时间', value: new Date().toLocaleString('zh-CN') });
  
  const usabilityWarning = usability === 'needs_trainer_review' ? '是 - 需要培训师复核' : 
                           usability === 'rejected' ? '是 - 已驳回' : '否';
  summarySheet.addRow({ item: '是否需要复核', value: usabilityWarning });
  
  if (options.includeScoreSheet) {
    const scoreSheet = workbook.addWorksheet('评分表');
    scoreSheet.columns = [
      { header: '分类', key: 'category', width: 15 },
      { header: '评分项', key: 'name', width: 20 },
      { header: '满分', key: 'maxScore', width: 10 },
      { header: '得分', key: 'score', width: 10 },
      { header: '权重', key: 'weight', width: 10 },
      { header: '备注', key: 'comment', width: 40 }
    ];
    
    task.scoreSheet.items.forEach(item => {
      scoreSheet.addRow({
        category: item.category,
        name: item.name,
        maxScore: item.maxScore,
        score: item.score,
        weight: item.weight,
        comment: item.comment
      });
    });
    
    scoreSheet.addRow({});
    scoreSheet.addRow({ name: '总计', maxScore: task.scoreSheet.maxTotalScore, score: task.scoreSheet.totalScore });
  }
  
  if (options.includeAnnotations) {
    const annotationSheet = workbook.addWorksheet('标注列表');
    annotationSheet.columns = [
      { header: '类型', key: 'type', width: 12 },
      { header: '内容', key: 'content', width: 40 },
      { header: '位置', key: 'position', width: 15 },
      { header: '创建人', key: 'author', width: 15 },
      { header: '创建时间', key: 'createdAt', width: 20 }
    ];
    
    task.annotations.forEach(a => {
      annotationSheet.addRow({
        type: ANNOTATION_LABELS[a.type],
        content: a.content,
        position: `(${a.position.x}, ${a.position.y})`,
        author: a.author,
        createdAt: new Date(a.createdAt).toLocaleString('zh-CN')
      });
    });
  }
  
  if (options.includeHistory) {
    const historySheet = workbook.addWorksheet('操作历史');
    historySheet.columns = [
      { header: '时间', key: 'timestamp', width: 20 },
      { header: '操作', key: 'description', width: 30 },
      { header: '类型', key: 'entityType', width: 15 },
      { header: '操作人', key: 'userId', width: 15 }
    ];
    
    task.history.slice(0, task.historyIndex + 1).forEach(h => {
      historySheet.addRow({
        timestamp: new Date(h.timestamp).toLocaleString('zh-CN'),
        description: h.action.description,
        entityType: h.action.entityType,
        userId: h.userId
      });
    });
  }
  
  const validationErrors = validateTaskCompletion(task);
  const consistencyErrors = checkAllConsistencies(task);
  const allErrors = [...validationErrors, ...consistencyErrors];
  
  if (allErrors.length > 0) {
    const issuesSheet = workbook.addWorksheet('待处理问题');
    issuesSheet.columns = [
      { header: '字段', key: 'field', width: 25 },
      { header: '问题', key: 'message', width: 50 },
      { header: '建议', key: 'suggestion', width: 50 }
    ];
    
    allErrors.forEach(e => {
      issuesSheet.addRow({
        field: e.field,
        message: e.message,
        suggestion: e.suggestion
      });
    });
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}

export async function exportToPDF(task: ReviewTask, options: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    const currentLevel = REVIEW_LEVELS.find(l => l.id === task.currentLevelId);
    const usability = determineUsability(task);
    const scorePercentage = (task.scoreSheet.totalScore / task.scoreSheet.maxTotalScore * 100).toFixed(0);
    
    doc.fontSize(20).text('儿童几何拼图课堂 - 审核报告', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).text('一、基本信息', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`任务标题：${task.title}`);
    doc.text(`任务描述：${task.description}`);
    doc.text(`当前关卡：${currentLevel?.name || '未知'}`);
    doc.text(`负责人：${task.assignee}`);
    doc.text(`总分：${task.scoreSheet.totalScore} / ${task.scoreSheet.maxTotalScore} (${scorePercentage}%)`);
    doc.text(`结论状态：${task.conclusion ? CONCLUSION_STATUS_LABELS[task.conclusion.status] : '未填写'}`);
    
    doc.fillColor(usability === 'direct_use' ? '#22c55e' : usability === 'needs_trainer_review' ? '#f59e0b' : '#ef4444');
    doc.text(`可用性：${USABILITY_LABELS[usability]}`);
    doc.fillColor('black');
    
    doc.moveDown();
    
    if (task.conclusion) {
      doc.fontSize(14).text('二、审核结论', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      doc.text(`摘要：${task.conclusion.summary}`);
      doc.moveDown(0.3);
      doc.text(`详细发现：${task.conclusion.detailedFindings}`);
      doc.moveDown(0.3);
      doc.text(`改进建议：${task.conclusion.recommendations}`);
      doc.moveDown();
    }
    
    if (options.includeScoreSheet) {
      doc.fontSize(14).text('三、评分明细', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      
      task.scoreSheet.items.forEach((item, index) => {
        doc.text(`${index + 1}. [${item.category}] ${item.name}：${item.score}/${item.maxScore}分 (权重${item.weight})`);
        if (item.comment) {
          doc.text(`   备注：${item.comment}`, { indent: 20 });
        }
      });
      doc.moveDown();
    }
    
    if (options.includeAnnotations && task.annotations.length > 0) {
      doc.fontSize(14).text('四、异常标注', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12);
      
      task.annotations.forEach((a, index) => {
        doc.text(`${index + 1}. [${ANNOTATION_LABELS[a.type]}] ${a.content}`);
        doc.text(`   位置：(${a.position.x}, ${a.position.y})，创建人：${a.author}`, { indent: 20 });
      });
      doc.moveDown();
    }
    
    const validationErrors = validateTaskCompletion(task);
    const consistencyErrors = checkAllConsistencies(task);
    const allErrors = [...validationErrors, ...consistencyErrors];
    
    if (allErrors.length > 0) {
      doc.fontSize(14).fillColor('#ef4444').text('五、待处理问题', { underline: true });
      doc.fillColor('black');
      doc.moveDown(0.5);
      doc.fontSize(12);
      
      allErrors.forEach((e, index) => {
        doc.text(`${index + 1}. ${e.message}`);
        doc.fillColor('#666').text(`   建议：${e.suggestion}`, { indent: 20 });
        doc.fillColor('black');
      });
      doc.moveDown();
    }
    
    const usabilityNote = usability === 'direct_use' 
      ? '此结果可直接使用，无需培训师额外复核。'
      : usability === 'needs_trainer_review'
      ? '此结果需要安全培训师复核后才能使用。'
      : '此结果已被驳回，不可使用。';
    
    doc.fontSize(10).fillColor('#666').text(`备注：${usabilityNote}`);
    doc.text(`导出时间：${new Date().toLocaleString('zh-CN')}`);
    
    doc.end();
  });
}
