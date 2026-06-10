const STAGES = [
  { id: 'Z1', name: '1细胞期', hours: '0-0.75', boundaryNote: '受精后单细胞，尚未卵裂；清晰可见胚盘与卵黄' },
  { id: 'Z2', name: '2细胞期', hours: '0.75-1', boundaryNote: '第一次卵裂完成，两细胞大小均等，分裂沟清晰' },
  { id: 'Z4', name: '4细胞期', hours: '1-1.25', boundaryNote: '第二次卵裂，与第一次垂直，四细胞排列整齐' },
  { id: 'Z8', name: '8细胞期', hours: '1.25-1.5', boundaryNote: '第三次卵裂，八细胞分两层，层间界限可辨' },
  { id: 'Z16', name: '16细胞期', hours: '1.5-2', boundaryNote: '第四次卵裂，16细胞团，细胞大小开始略有差异' },
  { id: 'Z32', name: '32细胞期', hours: '2-2.5', boundaryNote: '第五次卵裂，32细胞团，胚盘呈高帽状' },
  { id: 'Z64', name: '64细胞期', hours: '2.5-3', boundaryNote: '第六次卵裂，64细胞，细胞界限逐渐模糊' },
  { id: 'Z128', name: '128细胞期', hours: '3-3.5', boundaryNote: '第七次卵裂，128细胞，进入早期囊胚' },
  { id: 'blastula-early', name: '早期囊胚', hours: '3.5-4.5', boundaryNote: '细胞团变平，胚盘高度降低，细胞数量继续增加' },
  { id: 'blastula-mid', name: '中期囊胚', hours: '4.5-5.5', boundaryNote: '胚盘呈扁平状，细胞更小，开始下包运动' },
  { id: 'blastula-late', name: '晚期囊胚', hours: '5.5-7', boundaryNote: '胚层薄而平，下包约30-50%，即将进入原肠胚' },
  { id: 'gastrula-early', name: '早期原肠胚', hours: '7-9', boundaryNote: '胚环形成，下包50%左右，内卷开始' },
  { id: 'gastrula-mid', name: '中期原肠胚', hours: '9-11', boundaryNote: '下包70-80%，胚盾明显，体轴雏形出现' },
  { id: 'gastrula-late', name: '晚期原肠胚', hours: '11-13', boundaryNote: '下包90-100%，胚体延伸，尾芽雏形' },
  { id: 'segmentation-10s', name: '10体节期', hours: '14-15', boundaryNote: '体节明显，约10对，头部隆起，视泡初现' },
  { id: 'segmentation-20s', name: '20体节期', hours: '19-20', boundaryNote: '20对体节，尾部延长，心脏开始跳动，听囊可见' },
  { id: 'pharyngula-prim5', name: 'Prim-5', hours: '24-25', boundaryNote: '孵化期，眼睛色素沉积，身体伸直，血液循环建立' },
  { id: 'pharyngula-prim15', name: 'Prim-15', hours: '30-32', boundaryNote: '胸鳍芽出现，下颌开始发育，色素增多' },
  { id: 'hatching', name: '出膜期', hours: '48-72', boundaryNote: '破膜而出，主动游动，各器官功能完善' },
  { id: 'larva', name: '幼鱼期', hours: '72+', boundaryNote: '完全出膜，自由摄食，形态接近成鱼' }
]

function generateMockData() {
  const records = []
  const sampleNames = [
    'WT_Control', 'WT_Control', 'Mutant_A', 'Mutant_A', 'Mutant_B',
    'WT_Treated', 'WT_Treated', 'Mutant_A_Treated', 'Mutant_B_Treated', 'WT_Control',
    'Mutant_A', 'WT_Treated', 'Mutant_B', 'WT_Control', 'Mutant_A_Treated'
  ]
  const sources = ['培养皿A01', '培养皿A02', '培养皿B01', '培养皿B02', '培养皿C01']
  const investigators = ['生态调查员-小王', '生态调查员-小李', '生态调查员-小张']

  for (let i = 0; i < 48; i++) {
    const stageIndex = Math.floor(Math.random() * STAGES.length)
    const isBoundary = Math.random() < 0.25
    const hasAnomaly = Math.random() < 0.15
    const sampleIdx = i % sampleNames.length
    const sourceIdx = i % sources.length
    const invIdx = i % investigators.length

    records.push({
      id: `rec-${1001 + i}`,
      originalRow: i + 2,
      imageName: `zebrafish_${String(1001 + i).padStart(4, '0')}.jpg`,
      sampleName: sampleNames[sampleIdx],
      source: sources[sourceIdx],
      investigator: investigators[invIdx],
      stage: STAGES[stageIndex].id,
      stageName: STAGES[stageIndex].name,
      isBoundary: isBoundary,
      boundaryExplanation: isBoundary ? 
        `该标本处于${STAGES[stageIndex].name}与${STAGES[Math.min(stageIndex + 1, STAGES.length - 1)].name}的过渡阶段，${STAGES[stageIndex].boundaryNote}` :
        null,
      confidence: isBoundary ? Math.floor(60 + Math.random() * 20) : Math.floor(85 + Math.random() * 15),
      hasAnomaly: hasAnomaly,
      anomalyDescription: hasAnomaly ? ['发育迟缓', '形态异常', '色素沉积不均', '体轴弯曲', '心包水肿'][Math.floor(Math.random() * 5)] : null,
      reviewStatus: hasAnomaly ? 'pending_review' : (isBoundary ? 'pending_review' : 'approved'),
      reviewer: null,
      reviewComment: null,
      reviewTime: null,
      finalStage: null,
      finalStageName: null,
      importBatch: 'batch-2026-06-01-v1',
      importTime: '2026-06-01 09:30:00',
      notes: `第${i + 1}号标本，来自${sources[sourceIdx]}`,
      cultureVersion: '培养记录v3.2'
    })
  }

  return records
}

let annotationRecords = generateMockData()
let importBatches = [
  {
    id: 'batch-2026-06-01-v1',
    name: '2026年6月1日 第一批导入',
    importTime: '2026-06-01 09:30:00',
    recordCount: 48,
    source: 'manual',
    fileName: '斑马鱼胚胎标注_20260601_v1.xlsx',
    status: 'completed'
  }
]

module.exports = {
  STAGES,
  annotationRecords,
  importBatches,
  generateMockData
}
