export type Section = 'strings' | 'woodwinds' | 'brass' | 'percussion'

export interface Position {
  x: number
  y: number
  z: number
}

export interface Musician {
  id: string
  name: string
  section: Section
  position: Position
  soundPressure: number
  instrument: string
  radiationAngle: number
  reportNote: string
}

export interface AbsorptionMaterial {
  id: string
  name: string
  position: Position
  size: { width: number; height: number; depth: number }
  absorptionCoefficients: Record<string, number>
  missingFrequencies: string[]
}

export interface TimelineEntry {
  sectionName: string
  enterTime: number
}

export const musicians: Musician[] = [
  {
    id: 'm01',
    name: '张伟',
    section: 'strings',
    position: { x: -3.5, y: 0, z: -4 },
    soundPressure: 88,
    instrument: '小提琴',
    radiationAngle: 120,
    reportNote: '第一小提琴首席，位于舞台左前方，声辐射指向右前方，高频明亮，与第二小提琴形成左右呼应'
  },
  {
    id: 'm02',
    name: '李娜',
    section: 'strings',
    position: { x: -2.5, y: 0, z: -3.8 },
    soundPressure: 85,
    instrument: '小提琴',
    radiationAngle: 120,
    reportNote: '第一小提琴声部成员，位于首席正后方，声锥被前方首席遮挡，造成高频衰减约3dB，属于遮挡测试用例'
  },
  {
    id: 'm03',
    name: '王芳',
    section: 'strings',
    position: { x: 3.5, y: 0, z: -4 },
    soundPressure: 87,
    instrument: '小提琴',
    radiationAngle: 120,
    reportNote: '第二小提琴首席，位于舞台右前方，声辐射指向左前方，与第一小提琴形成对称布局'
  },
  {
    id: 'm04',
    name: '赵敏',
    section: 'strings',
    position: { x: -1.5, y: 0, z: -2 },
    soundPressure: 84,
    instrument: '中提琴',
    radiationAngle: 110,
    reportNote: '中提琴声部，位于舞台中偏左，音色温暖浑厚，辐射角度略窄于小提琴'
  },
  {
    id: 'm05',
    name: '刘洋',
    section: 'strings',
    position: { x: 0, y: 0, z: -1 },
    soundPressure: 82,
    instrument: '大提琴',
    radiationAngle: 130,
    reportNote: '大提琴声部，位于舞台中央偏前，低频辐射宽广，与低音提琴形成低音支撑'
  },
  {
    id: 'm06',
    name: '陈强',
    section: 'strings',
    position: { x: -4, y: 0, z: 2 },
    soundPressure: 80,
    instrument: '低音提琴',
    radiationAngle: 140,
    reportNote: '低音提琴声部，位于舞台左后方，低频辐射角度最大，为整个弦乐组提供基础低音'
  },
  {
    id: 'm07',
    name: '孙丽',
    section: 'woodwinds',
    position: { x: -1, y: 0, z: 0 },
    soundPressure: 83,
    instrument: '长笛',
    radiationAngle: 100,
    reportNote: '长笛声部，位于木管组左端，高频穿透力强，辐射方向偏右前方'
  },
  {
    id: 'm08',
    name: '周杰',
    section: 'woodwinds',
    position: { x: 0.5, y: 0, z: 0.2 },
    soundPressure: 84,
    instrument: '双簧管',
    radiationAngle: 95,
    reportNote: '双簧管声部，位于木管组中部偏左，音色穿透力极强，常作为调音基准'
  },
  {
    id: 'm09',
    name: '吴静',
    section: 'woodwinds',
    position: { x: 1.5, y: 0, z: 0.4 },
    soundPressure: 82,
    instrument: '单簧管',
    radiationAngle: 100,
    reportNote: '单簧管声部，位于木管组中部偏右，音域宽广，动态范围大，辐射较为均匀'
  },
  {
    id: 'm10',
    name: '郑涛',
    section: 'woodwinds',
    position: { x: 2.5, y: 0, z: 0.6 },
    soundPressure: 81,
    instrument: '大管',
    radiationAngle: 105,
    reportNote: '大管声部，位于木管组右端，低频丰富，辐射角度较大，与弦乐低音声部形成良好衔接'
  },
  {
    id: 'm11',
    name: '黄磊',
    section: 'brass',
    position: { x: 2, y: 0, z: 2 },
    soundPressure: 95,
    instrument: '圆号',
    radiationAngle: 150,
    reportNote: '圆号声部，位于铜管组左端，声压级最高之一，辐射角度极宽，背向观众时声压降低约6dB'
  },
  {
    id: 'm12',
    name: '林峰',
    section: 'brass',
    position: { x: 3, y: 0, z: 2.5 },
    soundPressure: 97,
    instrument: '小号',
    radiationAngle: 90,
    reportNote: '小号声部，位于铜管组中部，声压级极高，辐射角度窄且指向性强，需注意对周围声部的掩蔽效应'
  },
  {
    id: 'm13',
    name: '何军',
    section: 'brass',
    position: { x: 4, y: 0, z: 3 },
    soundPressure: 94,
    instrument: '长号',
    radiationAngle: 85,
    reportNote: '长号声部，位于铜管组右端，辐射角度最窄，指向性极强，高频明亮集中'
  },
  {
    id: 'm14',
    name: '马超',
    section: 'brass',
    position: { x: -3, y: 0, z: -3 },
    soundPressure: 93,
    instrument: '小号',
    radiationAngle: 90,
    reportNote: '铜管演奏员误置于弦乐区左前方，声压级远超周围弦乐演奏者，对第一小提琴造成严重掩蔽，属于分区错误测试用例'
  },
  {
    id: 'm15',
    name: '杨帆',
    section: 'percussion',
    position: { x: 4, y: 0, z: 4 },
    soundPressure: 100,
    instrument: '定音鼓',
    radiationAngle: 170,
    reportNote: '定音鼓声部，位于舞台右后方，声压级全团最高，辐射角度接近全向，低频能量对全场覆盖显著'
  }
]

export const materials: AbsorptionMaterial[] = [
  {
    id: 'mat01',
    name: '后墙吸声板',
    position: { x: 0, y: 2, z: 5 },
    size: { width: 12, height: 4, depth: 0.1 },
    absorptionCoefficients: {
      '125': 0.15,
      '250': 0.35,
      '500': 0.65,
      '1000': 0.8,
      '2000': 0.85,
      '4000': 0.9
    },
    missingFrequencies: []
  },
  {
    id: 'mat02',
    name: '顶部声学吊云',
    position: { x: 0, y: 5, z: 0 },
    size: { width: 8, height: 0.05, depth: 6 },
    absorptionCoefficients: {
      '125': 0.1,
      '250': 0.2,
      '500': 0.55,
      '1000': 0.75
    },
    missingFrequencies: ['2000', '4000']
  },
  {
    id: 'mat03',
    name: '舞台声学反射罩',
    position: { x: -5, y: 2.5, z: 0 },
    size: { width: 0.15, height: 5, depth: 8 },
    absorptionCoefficients: {
      '125': 0.05,
      '250': 0.08,
      '500': 0.1,
      '1000': 0.12,
      '2000': 0.15,
      '4000': 0.18
    },
    missingFrequencies: []
  }
]

export const timelineEntries: TimelineEntry[] = [
  {
    sectionName: '弦乐',
    enterTime: 0
  },
  {
    sectionName: '木管',
    enterTime: 12
  },
  {
    sectionName: '铜管',
    enterTime: 28
  },
  {
    sectionName: '打击乐',
    enterTime: 40
  }
]
