import { v4 as uuidv4 } from 'uuid';
import { ReviewTask, DEFAULT_SCORE_CATEGORIES } from '@puzzle/shared';
import { store } from './store';

function createSampleTask(
  title: string, 
  levelId: string, 
  status: ReviewTask['status'],
  hasErrors: boolean = false,
  hasUnsynced: boolean = false
): ReviewTask {
  const scoreItems = DEFAULT_SCORE_CATEGORIES.map((category, idx) => ({
    id: uuidv4(),
    name: `${category}评估`,
    category,
    maxScore: 20,
    score: hasErrors ? 12 + idx * 2 : 18 - idx,
    weight: 1,
    comment: hasErrors ? `${category}存在问题，需要改进` : `${category}表现良好`,
    linkedAnnotationIds: []
  }));
  
  const totalScore = scoreItems.reduce((sum, item) => sum + item.score * item.weight, 0);
  
  const taskId = uuidv4();
  const now = new Date();
  
  const task: ReviewTask = {
    id: taskId,
    title,
    description: '儿童几何拼图课堂审核任务，请检查拼图是否完整、位置是否正确。',
    status,
    currentLevelId: levelId,
    assignee: '训练员-001',
    reviewer: status === 'completed' ? '培训师-001' : undefined,
    layers: [
      { id: uuidv4(), name: '背景层', type: 'puzzle', visible: true, locked: false, opacity: 1, order: 0 },
      { id: uuidv4(), name: '参考图层', type: 'reference', visible: true, locked: false, opacity: 0.5, order: 1 },
      { id: uuidv4(), name: '标注层', type: 'annotation', visible: true, locked: false, opacity: 1, order: 2 },
      { id: uuidv4(), name: '网格层', type: 'grid', visible: false, locked: true, opacity: 0.3, order: 3 }
    ],
    annotations: hasErrors ? [
      {
        id: uuidv4(),
        layerId: '',
        type: 'error',
        position: { x: 150, y: 200 },
        content: '三角形位置偏移，超出边界范围5mm',
        author: '训练员-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        screenshotRequired: true,
        screenshotPath: undefined
      },
      {
        id: uuidv4(),
        layerId: '',
        type: 'warning',
        position: { x: 400, y: 300 },
        content: '正方形颜色略有偏差，与参考图不一致',
        author: '训练员-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: uuidv4(),
        layerId: '',
        type: 'note',
        position: { x: 600, y: 450 },
        content: '圆形拼图素材缺失，无法完整评估',
        author: '训练员-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ] : [
      {
        id: uuidv4(),
        layerId: '',
        type: 'correct',
        position: { x: 200, y: 150 },
        content: '三角形位置正确，拼接紧密',
        author: '训练员-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: uuidv4(),
        layerId: '',
        type: 'correct',
        position: { x: 450, y: 250 },
        content: '正方形颜色匹配准确',
        author: '训练员-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: uuidv4(),
        layerId: '',
        type: 'note',
        position: { x: 350, y: 400 },
        content: '整体完成度高，拼图逻辑清晰',
        author: '训练员-001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ],
    scoreSheet: {
      id: uuidv4(),
      taskId,
      items: scoreItems,
      totalScore,
      maxTotalScore: 100,
      updatedAt: now.toISOString(),
      synchronizedWithNotes: !hasUnsynced
    },
    conclusion: status === 'completed' || status === 'needs_review' ? {
      id: uuidv4(),
      taskId,
      status: hasErrors ? 'needs_confirmation' : 'pass',
      summary: hasErrors ? '存在多处问题，需要培训师复核' : '拼图完成质量良好，各项指标达标',
      detailedFindings: hasErrors 
        ? '1. 三角形位置超出边界\n2. 正方形颜色偏差\n3. 圆形素材缺失，无法评估' 
        : '所有图形位置准确，颜色匹配，拼接完整。',
      recommendations: hasErrors 
        ? '1. 重新调整三角形位置\n2. 更换正方形拼图\n3. 补充圆形拼图素材后重新评估' 
        : '保持当前质量标准，可用于教学示范。',
      usability: hasErrors ? 'needs_trainer_review' : 'direct_use',
      synchronizedWithScoreSheet: !hasUnsynced,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    } : undefined,
    notes: hasUnsynced ? [
      {
        id: uuidv4(),
        taskId,
        content: '最新发现：三角形边缘有磨损，可能影响评分标准，需要重新评估。',
        author: '培训师-001',
        createdAt: new Date(now.getTime() + 3600000).toISOString(),
        updatedAt: new Date(now.getTime() + 3600000).toISOString(),
        affectsScoreSheet: true,
        affectsConclusion: true
      }
    ] : [],
    history: [],
    historyIndex: -1,
    materials: [
      { id: uuidv4(), name: '三角形拼图', type: 'image', path: '/materials/triangle.png', missing: false },
      { id: uuidv4(), name: '正方形拼图', type: 'image', path: '/materials/square.png', missing: false },
      { id: uuidv4(), name: '圆形拼图', type: 'image', path: '/materials/circle.png', missing: hasErrors }
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedAt: status === 'completed' ? now.toISOString() : undefined
  };
  
  task.annotations.forEach(a => {
    a.layerId = task.layers.find(l => l.type === 'annotation')?.id || '';
  });
  
  return task;
}

export function seedData(): ReviewTask[] {
  const tasks: ReviewTask[] = [
    createSampleTask('2026春季班-第1课-几何拼图', 'level-4', 'completed', false, false),
    createSampleTask('2026春季班-第2课-形状组合', 'level-2', 'completed', true, false),
    createSampleTask('2026春季班-第3课-创意拼图', 'level-1', 'in_progress', false, true),
    createSampleTask('2026春季班-第4课-对称图形', 'level-3', 'needs_review', true, true),
    createSampleTask('2026春季班-第5课-立体几何', 'level-1', 'pending', false, false)
  ];
  
  store.setTasks(tasks);
  console.log(`已加载 ${tasks.length} 条示例任务数据`);
  
  tasks.forEach(task => {
    console.log(`  - [${task.status}] ${task.title}`);
  });
  
  return tasks;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedData();
  console.log('\n种子数据加载完成！');
}
