import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  ReviewTask, Annotation, Layer, ReviewNote, ScoreSheet, Conclusion,
  ExportOptions, REVIEW_LEVELS, DEFAULT_SCORE_CATEGORIES 
} from '@puzzle/shared';
import { store } from '../store';
import { recordHistory, undoTask, redoTask, getTaskHistory, canUndo, canRedo } from '../services/historyService';
import { 
  checkAllConsistencies, markScoreAsSynced, markConclusionAsSynced,
  onNoteUpdate, onScoreUpdate, determineUsability 
} from '../services/consistencyService';
import { validateTaskCompletion, validateAnnotation, validateBoundaryConditions } from '../services/validationService';
import { exportToExcel, exportToPDF } from '../services/exportService';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const tasks = store.getTasks();
  res.json({ success: true, data: tasks });
});

router.get('/levels', (req: Request, res: Response) => {
  res.json({ success: true, data: REVIEW_LEVELS });
});

router.get('/:id', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const consistencyErrors = checkAllConsistencies(task);
  const validationErrors = validateTaskCompletion(task);
  
  res.json({
    success: true,
    data: {
      ...task,
      canUndo: canUndo(task),
      canRedo: canRedo(task),
      usability: determineUsability(task)
    },
    validationErrors: [...validationErrors, ...consistencyErrors]
  });
});

router.get('/:id/history', (req: Request, res: Response) => {
  const history = getTaskHistory(req.params.id);
  if (!history) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  res.json({ success: true, data: history });
});

router.post('/', (req: Request, res: Response) => {
  const { title, description, levelId = 'level-1' } = req.body;
  
  if (!title) {
    return res.status(400).json({ success: false, error: '任务标题不能为空' });
  }
  
  const scoreItems = DEFAULT_SCORE_CATEGORIES.map((category, idx) => ({
    id: uuidv4(),
    name: `${category}评估`,
    category,
    maxScore: 20,
    score: 0,
    weight: 1,
    comment: '',
    linkedAnnotationIds: []
  }));
  
  const newTask: ReviewTask = {
    id: uuidv4(),
    title,
    description: description || '',
    status: 'in_progress',
    currentLevelId: levelId,
    assignee: '训练员-001',
    layers: [
      { id: uuidv4(), name: '背景层', type: 'puzzle', visible: true, locked: false, opacity: 1, order: 0 },
      { id: uuidv4(), name: '参考图层', type: 'reference', visible: true, locked: false, opacity: 0.5, order: 1 },
      { id: uuidv4(), name: '标注层', type: 'annotation', visible: true, locked: false, opacity: 1, order: 2 },
      { id: uuidv4(), name: '网格层', type: 'grid', visible: false, locked: true, opacity: 0.3, order: 3 }
    ],
    annotations: [],
    scoreSheet: {
      id: uuidv4(),
      taskId: '',
      items: scoreItems,
      totalScore: 0,
      maxTotalScore: 100,
      updatedAt: new Date().toISOString(),
      synchronizedWithNotes: true
    },
    notes: [],
    history: [],
    historyIndex: -1,
    materials: [
      { id: uuidv4(), name: '三角形拼图', type: 'image', path: '/materials/triangle.png', missing: false },
      { id: uuidv4(), name: '正方形拼图', type: 'image', path: '/materials/square.png', missing: false },
      { id: uuidv4(), name: '圆形拼图', type: 'image', path: '/materials/circle.png', missing: true }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  newTask.scoreSheet.taskId = newTask.id;
  
  store.addTask(newTask);
  
  recordHistory(newTask, {
    type: 'create',
    entityType: 'task',
    entityId: newTask.id,
    snapshot: newTask,
    description: '创建审核任务'
  });
  
  res.status(201).json({ success: true, data: newTask });
});

router.post('/:id/annotations', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const annotationData = req.body;
  const validationError = validateAnnotation(annotationData);
  if (validationError) {
    return res.status(400).json({ success: false, validationErrors: [validationError] });
  }
  
  const boundaryError = validateBoundaryConditions(
    annotationData.position.x,
    annotationData.position.y,
    800, 600
  );
  
  const newAnnotation: Annotation = {
    id: uuidv4(),
    layerId: annotationData.layerId || task.layers.find(l => l.type === 'annotation')?.id || '',
    type: annotationData.type,
    position: annotationData.position,
    content: annotationData.content,
    author: '训练员-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    screenshotRequired: annotationData.type === 'error'
  };
  
  const previousAnnotations = [...task.annotations];
  task.annotations.push(newAnnotation);
  
  recordHistory(task, {
    type: 'create',
    entityType: 'annotation',
    entityId: newAnnotation.id,
    snapshot: newAnnotation,
    previousSnapshot: null,
    description: `添加${annotationData.type === 'error' ? '错误' : ''}标注`
  });
  
  store.saveTask(task);
  
  res.json({
    success: true,
    data: { task, newAnnotation },
    validationErrors: boundaryError ? [boundaryError] : undefined
  });
});

router.put('/:id/annotations/:annotationId', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const annotationIndex = task.annotations.findIndex(a => a.id === req.params.annotationId);
  if (annotationIndex === -1) {
    return res.status(404).json({ success: false, error: '标注不存在' });
  }
  
  const previousAnnotation = { ...task.annotations[annotationIndex] };
  const updatedAnnotation = {
    ...task.annotations[annotationIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  task.annotations[annotationIndex] = updatedAnnotation;
  
  recordHistory(task, {
    type: 'update',
    entityType: 'annotation',
    entityId: updatedAnnotation.id,
    snapshot: updatedAnnotation,
    previousSnapshot: previousAnnotation
  });
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.delete('/:id/annotations/:annotationId', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const annotationIndex = task.annotations.findIndex(a => a.id === req.params.annotationId);
  if (annotationIndex === -1) {
    return res.status(404).json({ success: false, error: '标注不存在' });
  }
  
  const deletedAnnotation = task.annotations.splice(annotationIndex, 1)[0];
  
  recordHistory(task, {
    type: 'delete',
    entityType: 'annotation',
    entityId: deletedAnnotation.id,
    snapshot: null,
    previousSnapshot: deletedAnnotation
  });
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.put('/:id/layers/:layerId', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const layerIndex = task.layers.findIndex(l => l.id === req.params.layerId);
  if (layerIndex === -1) {
    return res.status(404).json({ success: false, error: '图层不存在' });
  }
  
  const previousLayer = { ...task.layers[layerIndex] };
  task.layers[layerIndex] = { ...task.layers[layerIndex], ...req.body };
  
  recordHistory(task, {
    type: 'update',
    entityType: 'layer',
    entityId: req.params.layerId,
    snapshot: task.layers[layerIndex],
    previousSnapshot: previousLayer
  });
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.post('/:id/notes', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const newNote: ReviewNote = {
    id: uuidv4(),
    taskId: task.id,
    content: req.body.content,
    author: '训练员-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    affectsScoreSheet: req.body.affectsScoreSheet ?? true,
    affectsConclusion: req.body.affectsConclusion ?? true
  };
  
  task.notes.push(newNote);
  onNoteUpdate(task, newNote);
  
  recordHistory(task, {
    type: 'create',
    entityType: 'note',
    entityId: newNote.id,
    snapshot: newNote
  });
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.put('/:id/notes/:noteId', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const noteIndex = task.notes.findIndex(n => n.id === req.params.noteId);
  if (noteIndex === -1) {
    return res.status(404).json({ success: false, error: '备注不存在' });
  }
  
  const previousNote = { ...task.notes[noteIndex] };
  task.notes[noteIndex] = {
    ...task.notes[noteIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  onNoteUpdate(task, task.notes[noteIndex]);
  
  recordHistory(task, {
    type: 'update',
    entityType: 'note',
    entityId: req.params.noteId,
    snapshot: task.notes[noteIndex],
    previousSnapshot: previousNote
  });
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.put('/:id/score', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const previousScore = JSON.parse(JSON.stringify(task.scoreSheet));
  
  if (req.body.items) {
    task.scoreSheet.items = req.body.items;
    task.scoreSheet.totalScore = req.body.items.reduce((sum: number, item: any) => sum + item.score * item.weight, 0);
  }
  
  onScoreUpdate(task);
  task.scoreSheet.updatedAt = new Date().toISOString();
  
  recordHistory(task, {
    type: 'update',
    entityType: 'score',
    entityId: task.scoreSheet.id,
    snapshot: JSON.parse(JSON.stringify(task.scoreSheet)),
    previousSnapshot: previousScore
  });
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.put('/:id/score/sync', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  task.scoreSheet = markScoreAsSynced(task);
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.put('/:id/conclusion', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const previousConclusion = task.conclusion ? JSON.parse(JSON.stringify(task.conclusion)) : null;
  
  if (!task.conclusion) {
    task.conclusion = {
      id: uuidv4(),
      taskId: task.id,
      status: req.body.status || 'pending',
      summary: req.body.summary || '',
      detailedFindings: req.body.detailedFindings || '',
      recommendations: req.body.recommendations || '',
      usability: 'needs_trainer_review',
      synchronizedWithScoreSheet: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } else {
    task.conclusion = {
      ...task.conclusion,
      ...req.body,
      synchronizedWithScoreSheet: false,
      updatedAt: new Date().toISOString()
    };
  }
  
  if (task.conclusion) {
    task.conclusion.usability = determineUsability(task);
    
    recordHistory(task, {
      type: 'update',
      entityType: 'conclusion',
      entityId: task.conclusion.id,
      snapshot: JSON.parse(JSON.stringify(task.conclusion)),
      previousSnapshot: previousConclusion
    });
  }
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.put('/:id/conclusion/sync', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const synced = markConclusionAsSynced(task);
  if (synced) {
    task.conclusion = synced;
  }
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.post('/:id/undo', (req: Request, res: Response) => {
  const task = undoTask(req.params.id);
  if (!task) {
    return res.status(400).json({ success: false, error: '无法撤销，已经是最早状态' });
  }
  
  store.saveTask(task);
  
  const consistencyErrors = checkAllConsistencies(task);
  const validationErrors = validateTaskCompletion(task);
  
  res.json({
    success: true,
    data: {
      ...task,
      canUndo: canUndo(task),
      canRedo: canRedo(task)
    },
    validationErrors: [...validationErrors, ...consistencyErrors]
  });
});

router.post('/:id/redo', (req: Request, res: Response) => {
  const task = redoTask(req.params.id);
  if (!task) {
    return res.status(400).json({ success: false, error: '无法重做，已经是最新状态' });
  }
  
  store.saveTask(task);
  
  const consistencyErrors = checkAllConsistencies(task);
  const validationErrors = validateTaskCompletion(task);
  
  res.json({
    success: true,
    data: {
      ...task,
      canUndo: canUndo(task),
      canRedo: canRedo(task)
    },
    validationErrors: [...validationErrors, ...consistencyErrors]
  });
});

router.post('/:id/reopen', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const previousStatus = task.status;
  task.status = 'in_progress';
  task.completedAt = undefined;
  
  recordHistory(task, {
    type: 'reopen',
    entityType: 'task',
    entityId: task.id,
    snapshot: { status: task.status },
    previousSnapshot: { status: previousStatus }
  });
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.post('/:id/complete', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const validationErrors = validateTaskCompletion(task);
  const consistencyErrors = checkAllConsistencies(task);
  const allErrors = [...validationErrors, ...consistencyErrors];
  
  if (allErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: '存在待处理问题，无法完成审核',
      validationErrors: allErrors
    });
  }
  
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  
  if (task.conclusion) {
    task.conclusion.usability = determineUsability(task);
  }
  
  store.saveTask(task);
  res.json({ success: true, data: task });
});

router.put('/:id/level', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const { levelId } = req.body;
  if (!REVIEW_LEVELS.find(l => l.id === levelId)) {
    return res.status(400).json({ success: false, error: '无效的关卡ID' });
  }
  
  task.currentLevelId = levelId;
  store.saveTask(task);
  
  res.json({ success: true, data: task });
});

router.post('/:id/export', async (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const options: ExportOptions = {
    format: req.body.format || 'both',
    includeAnnotations: req.body.includeAnnotations ?? true,
    includeScoreSheet: req.body.includeScoreSheet ?? true,
    includeHistory: req.body.includeHistory ?? false,
    includeScreenshots: req.body.includeScreenshots ?? false
  };
  
  try {
    const safeTitle = task.title.replace(/[<>:"/\\|?*]/g, '_');
    const encodedTitle = encodeURIComponent(safeTitle);
    
    if (options.format === 'excel' || options.format === 'both') {
      const excelBuffer = await exportToExcel(task, options);
      if (options.format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="review-report.xlsx"; filename*=UTF-8''${encodedTitle}-%E5%AE%A1%E6%A0%B8%E6%8A%A5%E5%91%8A.xlsx`);
        return res.send(excelBuffer);
      }
    }
    
    if (options.format === 'pdf' || options.format === 'both') {
      const pdfBuffer = await exportToPDF(task, options);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="review-report.pdf"; filename*=UTF-8''${encodedTitle}-%E5%AE%A1%E6%A0%B8%E6%8A%A5%E5%91%8A.pdf`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: '导出失败',
      validationErrors: [{
        field: 'export',
        message: '导出服务暂时不可用',
        suggestion: '请稍后重试，或联系技术支持'
      }]
    });
  }
});

router.get('/:id/validate', (req: Request, res: Response) => {
  const task = store.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const validationErrors = validateTaskCompletion(task);
  const consistencyErrors = checkAllConsistencies(task);
  
  res.json({
    success: true,
    data: {
      isValid: validationErrors.length === 0 && consistencyErrors.length === 0,
      usability: determineUsability(task)
    },
    validationErrors: [...validationErrors, ...consistencyErrors]
  });
});

export default router;
