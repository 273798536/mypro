import type { DimensionRow, Sample, VersionEvent } from './types'
import { bandForScore } from './types'

function v(
  stage: VersionEvent['stage'],
  score: number,
  actor: string,
  ts: string,
  rationale: string,
): VersionEvent {
  return { stage, score, band: bandForScore(score), actor, ts, rationale }
}

function dims(
  stage: DimensionRow['stage'],
  内容: number,
  结构: number,
  语言: number,
  书写: number,
): DimensionRow {
  return { stage, 内容, 结构, 语言, 书写 }
}

export const SAMPLES: Sample[] = [
  {
    sampleId: 'EW-0612-01',
    source: '运营主管-周报0612',
    essayTitle: '让一步，海阔天空',
    essayContent:
      '退一步并非怯懦，而是给彼此留出转身余地。巷口两车相持，谁也不肯后退半寸，结果堵了整条街；若有一人稍退，路便通了。人与人的相处亦是如此：执拗于一时对错，往往两败俱伤，而让出一寸，反而换来理解的空间。让，不是输，是把僵局重新打开的那把钥匙。',
    gradeLevel: '高三',
    rawFields: { '样本编号': 'EW-0612-01', '数据来源': '运营主管-周报0612', '处理进度': '已对比', '命题': '让一步，海阔天空', '适用年级': '高三' },
    processingStatus: '已对比',
    changeStatus: '一致',
    storyline: [
      v('old', 42, '旧模型v1.2', '2026-06-12T09:10:00', '切题，论证平实，结构完整；语言平顺但欠亮点，定为二类文中段。'),
      v('new', 42, '新模型v2.0', '2026-06-16T14:00:00', '切题度、结构、语言三维评分与旧模型一致，未触发改判。'),
    ],
    drift: { detected: false, reason: '', impactScope: '', thresholdBand: '二类文' },
    dimensions: [
      dims('old', 16, 10, 11, 5),
      dims('new', 16, 10, 11, 5),
    ],
    rejudgeable: false,
  },
  {
    sampleId: 'EW-0612-02',
    source: '运营主管-周报0612',
    essayTitle: '慢下来的勇气',
    essayContent:
      '这个时代推崇快：快出结果、快有答案。可有些东西本就急不得。一锅好汤要小火慢炖，一段成长要时间发酵。慢，不是停滞，而是给思考留白，让判断沉淀。当我学着放下对"立刻见效"的执念，反而看清了自己真正想走的路。慢下来的勇气，是把节奏交还给内心的清醒。',
    gradeLevel: '高三',
    rawFields: { '编号': 'EW-0612-02', '样本来源': '运营主管-周报0612', '当前状态': '已人工修正', '题目': '慢下来的勇气', '年级': '高三' },
    processingStatus: '已人工修正',
    changeStatus: '改判',
    storyline: [
      v('old', 36, '旧模型v1.2', '2026-06-12T09:12:00', '立意尚可，但论证略散；语言平淡，定为三类文上段。'),
      v('manual', 41, '小乔', '2026-06-13T20:40:00', '人工修正：第二段"给思考留白"立意有深度，结构首尾呼应，旧模型低估内容维度，上调至二类文。'),
      v('new', 43, '新模型v2.0', '2026-06-16T14:05:00', '新模型识别到立意递进与首尾呼应，内容维度上调；人工修正(41)已保留未被覆盖，新结果(43)与其方向一致。'),
    ],
    drift: { detected: false, reason: '', impactScope: '', thresholdBand: '二类文' },
    dimensions: [
      dims('old', 13, 9, 9, 5),
      dims('manual', 16, 10, 10, 5),
      dims('new', 17, 10, 11, 5),
    ],
    rejudgeable: false,
  },
  {
    sampleId: 'EW-0605-07',
    source: '线上灰度桶A',
    essayTitle: '工具之上，仍是人',
    essayContent:
      '工具越聪明，人越要清醒。搜索能给出答案，却给不出追问；算法能推荐选择，却替不了承担。把判断外包给工具，看似省力，实则在悄悄交出思考的权利。真正的高级，不是用得多顺，而是在工具铺天盖地时，仍保有停下来追问一句"为什么"的能力。',
    gradeLevel: '高二',
    rawFields: { 'id': 'EW-0605-07', '来源渠道': '线上灰度桶A', '状态': '已对比', '题旨': '工具之上，仍是人', '学段': '高二' },
    processingStatus: '已对比',
    changeStatus: '改判',
    storyline: [
      v('old', 33, '旧模型v1.2', '2026-06-05T10:20:00', '论点清晰但论据单薄，语言略口语化，定为三类文中段。'),
      v('new', 40, '新模型v2.0', '2026-06-16T14:10:00', '新模型捕捉到"交出思考权利"这一层递进立意，内容与结构维度上调，改判为二类文。'),
    ],
    drift: { detected: false, reason: '', impactScope: '', thresholdBand: '二类文' },
    dimensions: [
      dims('old', 12, 8, 8, 5),
      dims('new', 16, 10, 9, 5),
    ],
    rejudgeable: false,
  },
  {
    sampleId: 'EW-0605-09',
    source: '线上灰度桶A',
    essayTitle: '种一棵树最好的时间',
    essayContent:
      '有人问：现在开始还来得及吗？答案从来不是"早该如此"，而是"就现在"。十年前没种下的树，今天是最好的起点；今天犹豫不种的，十年后仍是一片空地。焦虑来自反复权衡，行动本身就在消解焦虑。别等万事俱备，那只是拖延给自己找的体面理由。埋下第一粒种子，时间会替你完成剩下的事。',
    gradeLevel: '高一',
    rawFields: { '样本ID': 'EW-0605-09', '出处': '线上灰度桶A', '处理状态': '待确认', '命题': '种一棵树最好的时间', '年级段': '高一' },
    processingStatus: '待确认',
    changeStatus: '漂移待确认',
    storyline: [
      v('old', 44, '旧模型v1.2', '2026-06-05T10:25:00', '立意鲜明，比喻与递进结合，语言凝练，定为二类文上段。'),
      v('new', 46, '新模型v2.0', '2026-06-16T14:15:00', '新模型上调语言与结构维度至接近满分，分值越过 45 分阈值进入一类文。'),
    ],
    drift: { detected: true, reason: '新模型分值 46 跨越 45 分阈值带边界、由「二类文」翻转为「一类文」且贴近边界 ±1，疑似阈值带漂移，需人工确认是否调整阈值或回滚该档判定。', impactScope: '该样本所在「一类文↔二类文」分界附近的同类样本可能整体受影响，建议扩大复核至该分界两侧 ±2 区间内的全部跨带样本。', thresholdBand: '一类文' },
    dimensions: [
      dims('old', 17, 11, 11, 5),
      dims('new', 18, 12, 11, 5),
    ],
    rejudgeable: false,
  },
  {
    sampleId: 'EW-0612-12',
    source: '运营主管-周报0612',
    essayTitle: '别让标签定义你',
    essayContent:
      '一个"内向"的标签，能困住一个人很多年。标签是高效的，却也是粗暴的——它抹平了细节，把立体的活人压成一张平面。我们习惯用标签快速分类，却忘了每个人都是流动的。撕掉标签，不是否认性格，而是拒绝被一句话盖棺定论。你比你被命名的那个词，要宽阔得多。',
    gradeLevel: '高三',
    rawFields: { '序号': 'EW-0612-12', '数据来源': '运营主管-周报0612', '处理进度': '待确认', '题目': '别让标签定义你', '适用年级': '高三' },
    processingStatus: '待确认',
    changeStatus: '漂移待确认',
    storyline: [
      v('old', 39, '旧模型v1.2', '2026-06-12T09:30:00', '立意新颖，语言有张力，定为二类文下段。'),
      v('new', 37, '新模型v2.0', '2026-06-16T14:20:00', '新模型对结构衔接评分偏严，分值回落至 37，跌破 38 分阈值进入三类文。'),
    ],
    drift: { detected: true, reason: '新模型分值 37 跨越 38 分阈值带边界、由「二类文」翻转为「三类文」且贴近边界 ±1，疑似阈值带漂移，需人工确认是否调整阈值或回滚该档判定。', impactScope: '该样本所在「二类文↔三类文」分界附近的同类样本可能整体受影响，建议扩大复核至该分界两侧 ±2 区间内的全部跨带样本。', thresholdBand: '三类文' },
    dimensions: [
      dims('old', 15, 10, 9, 5),
      dims('new', 14, 9, 9, 5),
    ],
    rejudgeable: false,
  },
  {
    sampleId: 'EW-0612-15',
    source: '运营主管-周报0612',
    essayTitle: '我的小习惯',
    essayContent:
      '我有个小习惯，每天睡前在本子上写三件当天的好事。一开始常常写不出，觉得日子平淡。可写着写着，眼睛好像变了——开始注意到食堂阿姨多给的一勺菜、同桌递来的一张纸条。原来不是日子没好事，是我从前没在记。这个小习惯，让我学会给生活记账，也学会给幸福留痕。',
    gradeLevel: '初三',
    rawFields: { '编号': 'EW-0612-15', '样本来源': '运营主管-周报0612', '当前状态': '待处理', '题目': '我的小习惯', '年级': '初三' },
    processingStatus: '待处理',
    changeStatus: '一致',
    storyline: [
      v('old', 28, '旧模型v1.2', '2026-06-12T09:40:00', '叙事完整但立意较浅，语言朴素，定为四类文上段；新模型结果尚未回灌。'),
    ],
    drift: { detected: false, reason: '', impactScope: '', thresholdBand: '四类文' },
    dimensions: [dims('old', 9, 7, 7, 5)],
    rejudgeable: false,
  },
  {
    sampleId: 'EW-HIS-03',
    source: '历史误判库',
    essayTitle: '退，是为了进',
    essayContent:
      '退，常被当作负面的字。可退一步，有时是为了看清整盘棋。下棋的人懂：舍一子，换全局。人生亦然——退掉无效的忙碌，才能把力气花在要紧处；退开一时的争执，才能保住长远的关系。退，不是认输的姿态，而是进的战略。懂得何时该退的人，往往走得更远。',
    gradeLevel: '高二',
    rawFields: { '样本ID': 'EW-HIS-03', '出处': '历史误判库', '处理状态': '待处理', '命题': '退，是为了进', '年级段': '高二' },
    processingStatus: '待处理',
    changeStatus: '一致',
    storyline: [
      v('old', 31, '旧模型v1.2', '2026-05-20T11:00:00', '旧模型误判：仅按字面切题度评分，未识别"以退为进"的立意递进与首尾呼应结构，定为三类文下段。'),
    ],
    drift: { detected: false, reason: '', impactScope: '', thresholdBand: '三类文' },
    dimensions: [dims('old', 11, 8, 7, 5)],
    rejudgeable: true,
  },
  {
    sampleId: 'EW-HIS-07',
    source: '历史误判库',
    essayTitle: '看见平凡',
    essayContent:
      '我们总被教导要做不平凡的人，却很少被允许安心地平凡。可这世上绝大多数光，是平凡的人点亮的——清晨扫街的人、深夜守店的人、准时回家做饭的人。平凡不是失败，是大多数生活的底色。学会看见平凡里的认真，才算真正看见了生活。不必人人惊雷，安静地扎根，也是一种了不起。',
    gradeLevel: '高一',
    rawFields: { 'id': 'EW-HIS-07', '来源渠道': '历史误判库', '状态': '已回灌', '题旨': '看见平凡', '学段': '高一' },
    processingStatus: '已回灌',
    changeStatus: '改判',
    storyline: [
      v('old', 35, '旧模型v1.2', '2026-05-18T10:00:00', '旧模型误判：将"平凡"主题判为立意消极，内容维度严重低估，定为三类文中段。'),
      v('new', 44, '新模型v2.0(回灌)', '2026-06-10T15:00:00', '回灌重判：新模型识别"看见平凡里的认真"为正向立意升华，内容维度由 12 上调至 18，总分 35→44，改判为二类文上段，可解释该改判。'),
    ],
    drift: { detected: false, reason: '', impactScope: '', thresholdBand: '二类文' },
    dimensions: [
      dims('old', 12, 9, 9, 5),
      dims('new', 18, 11, 10, 5),
    ],
    rejudgeable: false,
    explainsChange: true,
  },
]

export interface RejudgeResult {
  event: VersionEvent
  dimensions: DimensionRow
  explainsChange: boolean
  explanation: string
}

export const REJUDGE_RESULTS: Record<string, RejudgeResult> = {
  'EW-HIS-03': {
    event: v('new', 42, '新模型v2.0(回灌)', '2026-06-18T09:30:00', '回灌重判：新模型引入立意深度与篇章逻辑建模，识别"以退为进"的递进立意与首尾呼应结构，内容维度由 11 上调至 18，总分 31→42，档位由三类文改判为二类文。'),
    dimensions: dims('new', 18, 10, 10, 4),
    explainsChange: true,
    explanation:
      '能解释改判。旧模型v1.2 仅按字面切题度评分，未识别第二段"以退为进"的立意递进与首尾呼应的结构设计，导致内容维度严重低估（11/20）；新模型v2.0 引入立意深度与篇章逻辑建模，将内容维度修正为 18/20，总分由 31 修正为 42，档位由三类文改判为二类文，改判原因可追溯、可解释。',
  },
}
