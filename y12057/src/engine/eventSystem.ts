import { v4 as uuidv4 } from 'uuid';
import type { 
  GameEvent, 
  EventType, 
  FestivalMap, 
  Deployment,
  WeatherCondition,
  DataSource,
  EventChoice
} from './types';

interface EventTemplate {
  type: EventType;
  title: string;
  descriptionGenerator: (context: EventContext) => string;
  baseProbability: number;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  maxSeverity: 'low' | 'medium' | 'high' | 'critical';
  dataSourceType: string;
  requiresLocation: boolean;
  choicesGenerator: (context: EventContext) => Array<{ id: string; text: string; consequence: number }>;
}

interface EventContext {
  map: FestivalMap;
  deployments: Deployment[];
  congestionIndex: number;
  patrolCoverage: number;
  weather: WeatherCondition;
  gameTime: number;
  totalDuration: number;
  activeEvents: GameEvent[];
  availableDataSources: DataSource[];
}

const eventTemplates: EventTemplate[] = [
  {
    type: 'exit_congestion',
    title: '出口拥堵警报',
    descriptionGenerator: (context) => {
      const exits = context.map.elements.filter(e => e.type === 'exit');
      const congestedExit = exits[Math.floor(Math.random() * exits.length)];
      return `${congestedExit.name}出现严重拥堵，当前人流已超过设计容量的${Math.floor(100 + context.congestionIndex * 50)}%。请立即增派安保力量进行疏导。`;
    },
    baseProbability: 0.15,
    minSeverity: 'low',
    maxSeverity: 'critical',
    dataSourceType: 'security_report',
    requiresLocation: true,
    choicesGenerator: () => [
      { id: '1', text: '立即增派应急响应队', consequence: -5 },
      { id: '2', text: '开启备用出口分流', consequence: -2 },
      { id: '3', text: '先核实数据再行动', consequence: -15 },
      { id: '4', text: '通知舞台延迟散场', consequence: -8 }
    ]
  },
  {
    type: 'patrol_gap',
    title: '巡逻空窗检测',
    descriptionGenerator: (context) => {
      const uncovered = Math.floor((1 - context.patrolCoverage) * 100);
      return `检测到巡逻覆盖盲区，约${uncovered}%的区域处于巡逻空窗状态。${uncovered > 30 ? '存在较高安全风险，建议立即调整巡逻路线。' : '请注意监控，必要时增派机动巡逻队。'}`;
    },
    baseProbability: 0.1,
    minSeverity: 'low',
    maxSeverity: 'medium',
    dataSourceType: 'patrol_report',
    requiresLocation: true,
    choicesGenerator: () => [
      { id: '1', text: '增派机动巡逻队', consequence: -3 },
      { id: '2', text: '调整现有巡逻路线', consequence: -1 },
      { id: '3', text: '暂时忽略，等待下一班次', consequence: -10 }
    ]
  },
  {
    type: 'weather_change',
    title: '天气突变预警',
    descriptionGenerator: (context) => {
      const weatherMessages: Record<WeatherCondition, string> = {
        clear: '天气晴朗，适合户外活动。',
        cloudy: '多云转阴，注意人群情绪变化。',
        rain: '开始下雨，请检查出口防滑措施，准备遮雨设施。',
        heavy_rain: '大雨来袭！请立即启动雨天应急预案，引导人群到避雨区域。',
        storm: '暴风雨警报！建议暂停所有户外演出，实施紧急疏散。'
      };
      return weatherMessages[context.weather] || '天气状况变化，请关注。';
    },
    baseProbability: 0.08,
    minSeverity: 'low',
    maxSeverity: 'critical',
    dataSourceType: 'weather_data',
    requiresLocation: false,
    choicesGenerator: () => [
      { id: '1', text: '启动雨天应急预案', consequence: -5 },
      { id: '2', text: '准备应急雨棚', consequence: -2 },
      { id: '3', text: '暂时观察', consequence: -12 }
    ]
  },
  {
    type: 'medical_emergency',
    title: '医疗紧急事件',
    descriptionGenerator: () => {
      const emergencies = ['中暑晕厥', '突发心脏病', '踩踏受伤', '酒精中毒', '斗殴受伤'];
      const emergency = emergencies[Math.floor(Math.random() * emergencies.length)];
      return `报告${emergency}事件，需要医疗支援和现场安保控制。请附近安保人员立即前往协助。`;
    },
    baseProbability: 0.06,
    minSeverity: 'medium',
    maxSeverity: 'critical',
    dataSourceType: 'security_report',
    requiresLocation: true,
    choicesGenerator: () => [
      { id: '1', text: '立即派应急响应队+医疗组', consequence: -3 },
      { id: '2', text: '派附近巡逻队协助', consequence: -8 },
      { id: '3', text: '仅通知医疗组', consequence: -15 }
    ]
  },
  {
    type: 'disturbance',
    title: '现场骚乱',
    descriptionGenerator: () => {
      const disturbances = ['人群推挤冲突', '醉酒闹事', '无票人员硬闯', '粉丝过激行为'];
      const disturbance = disturbances[Math.floor(Math.random() * disturbances.length)];
      return `发生${disturbance}，需要安保介入控制。请保持冷静，避免事态升级。`;
    },
    baseProbability: 0.05,
    minSeverity: 'low',
    maxSeverity: 'high',
    dataSourceType: 'security_report',
    requiresLocation: true,
    choicesGenerator: () => [
      { id: '1', text: '派应急响应队现场控制', consequence: -5 },
      { id: '2', text: '派巡逻队介入', consequence: -10 },
      { id: '3', text: '先监控事态发展', consequence: -15 }
    ]
  },
  {
    type: 'stage_overflow',
    title: '舞台区域过载',
    descriptionGenerator: (context) => {
      const stages = context.map.elements.filter(e => e.type === 'stage');
      const stage = stages[Math.floor(Math.random() * stages.length)];
      return `${stage.name}前方区域人群密度过高，已超过安全容量。请实施人流分流，防止发生踩踏事故。`;
    },
    baseProbability: 0.07,
    minSeverity: 'medium',
    maxSeverity: 'critical',
    dataSourceType: 'stage_map',
    requiresLocation: true,
    choicesGenerator: () => [
      { id: '1', text: '立即实施人流分流', consequence: -5 },
      { id: '2', text: '增派固定岗加强围栏', consequence: -3 },
      { id: '3', text: '通知舞台控制节奏', consequence: -8 }
    ]
  }
];

export class EventSystem {
  private map: FestivalMap;
  private eventHistory: Map<string, number> = new Map();
  private eventCooldown: number = 30;

  constructor(map: FestivalMap) {
    this.map = map;
  }

  public update(context: EventContext): GameEvent | null {
    for (const template of eventTemplates) {
      const probability = this.calculateProbability(template, context);
      
      if (Math.random() < probability) {
        const lastTriggered = this.eventHistory.get(template.type) || 0;
        if (context.gameTime - lastTriggered < this.eventCooldown) {
          continue;
        }

        const event = this.createEvent(template, context);
        if (event) {
          this.eventHistory.set(template.type, context.gameTime);
          return event;
        }
      }
    }

    return null;
  }

  private calculateProbability(template: EventTemplate, context: EventContext): number {
    let probability = template.baseProbability;

    const timeFactor = context.gameTime / context.totalDuration;
    probability *= (0.5 + timeFactor);

    if (template.type === 'exit_congestion') {
      probability *= (1 + context.congestionIndex);
      
      const nearEnd = context.gameTime > context.totalDuration * 0.8;
      if (nearEnd) probability *= 2;
    }

    if (template.type === 'patrol_gap') {
      probability *= (1.5 - context.patrolCoverage);
    }

    if (template.type === 'medical_emergency' || template.type === 'disturbance') {
      probability *= (1 + context.congestionIndex * 0.5);
    }

    if (template.type === 'weather_change') {
      probability *= (1 + (context.gameTime / context.totalDuration) * 0.5);
    }

    if (template.type === 'stage_overflow') {
      const peakTime = context.gameTime > context.totalDuration * 0.4 && 
                       context.gameTime < context.totalDuration * 0.7;
      if (peakTime) probability *= 1.5;
      probability *= (1 + context.congestionIndex * 0.3);
    }

    const activeSameType = context.activeEvents.filter(e => e.type === template.type).length;
    probability *= Math.max(0, 1 - activeSameType * 0.5);

    return Math.min(0.3, probability);
  }

  private mapSeverity(severityNum: number): 'low' | 'medium' | 'high' | 'critical' {
    if (severityNum <= 2) return 'low';
    if (severityNum === 3) return 'medium';
    if (severityNum === 4) return 'high';
    return 'critical';
  }

  private severityToNumber(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const map: Record<'low' | 'medium' | 'high' | 'critical', number> = {
      low: 2,
      medium: 3,
      high: 4,
      critical: 5
    };
    return map[severity];
  }

  private createEvent(template: EventTemplate, context: EventContext): GameEvent | null {
    const matchingDataSources = context.availableDataSources.filter(
      ds => ds.type === template.dataSourceType
    );

    if (matchingDataSources.length === 0) {
      return null;
    }

    const dataSource = matchingDataSources[Math.floor(Math.random() * matchingDataSources.length)];

    const minNum = this.severityToNumber(template.minSeverity);
    const maxNum = this.severityToNumber(template.maxSeverity);
    const severityRange = maxNum - minNum;
    let severityNum = minNum + Math.floor(Math.random() * (severityRange + 1));

    if (template.type === 'exit_congestion' && context.congestionIndex > 1.2) {
      severityNum = Math.min(5, severityNum + 1);
    }
    if (template.type === 'patrol_gap' && context.patrolCoverage < 0.4) {
      severityNum = Math.min(5, severityNum + 1);
    }

    const severity = this.mapSeverity(severityNum);

    let location: { x: number; y: number } | undefined;
    if (template.requiresLocation) {
      location = this.generateLocation(template.type, context);
    }

    return {
      id: uuidv4(),
      type: template.type,
      timestamp: context.gameTime,
      severity,
      title: template.title,
      description: template.descriptionGenerator(context),
      dataSourceId: dataSource.id,
      location,
      resolved: false,
      expiresAt: context.gameTime + 60,
      choices: template.choicesGenerator(context)
    };
  }

  private generateLocation(
    eventType: EventType,
    context: EventContext
  ): { x: number; y: number } {
    const exits = context.map.elements.filter(e => e.type === 'exit');
    const stages = context.map.elements.filter(e => e.type === 'stage');
    const attractions = context.map.elements.filter(e => 
      ['food', 'restroom'].includes(e.type)
    );

    let candidates: { x: number; y: number }[] = [];

    switch (eventType) {
      case 'exit_congestion':
        candidates = exits.map(e => ({
          x: e.x + e.width / 2,
          y: e.y + e.height / 2
        }));
        break;
      case 'patrol_gap':
        for (let i = 0; i < 20; i++) {
          candidates.push({
            x: 50 + Math.random() * (this.map.width - 100),
            y: 50 + Math.random() * (this.map.height - 100)
          });
        }
        break;
      case 'medical_emergency':
      case 'disturbance':
        candidates = [
          ...stages.map(s => ({ x: s.x + s.width / 2, y: s.y + s.height + 30 })),
          ...attractions.map(a => ({ x: a.x + a.width / 2, y: a.y + a.height / 2 }))
        ];
        break;
      case 'stage_overflow':
        candidates = stages.map(s => ({
          x: s.x + s.width / 2,
          y: s.y + s.height + 20
        }));
        break;
      default:
        candidates = [{ x: this.map.width / 2, y: this.map.height / 2 }];
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  public createDirtyExitCongestionEvent(
    context: EventContext,
    useBadData: boolean = true
  ): GameEvent {
    const exits = this.map.elements.filter(e => e.type === 'exit');
    const southExit = exits.find(e => e.id === 'exit-south') || exits[0];
    
    const description = useBadData 
      ? `${southExit.name}出现严重拥堵，预测峰值人数3500人（数据异常：票务数据缺失15%，可能混入上周数据）。请核实后决策。`
      : `${southExit.name}出现拥堵，当前人流超过设计容量140%。请增派安保力量。`;

    const dataSource = context.availableDataSources.find(
      ds => ds.id === 'ds-security-001'
    ) || context.availableDataSources[0];

    const exitCongestionTemplate = eventTemplates.find(t => t.type === 'exit_congestion')!;

    return {
      id: uuidv4(),
      type: 'exit_congestion',
      timestamp: context.gameTime,
      severity: useBadData ? 'critical' : 'high',
      title: '出口拥堵警报' + (useBadData ? ' [脏数据标记]' : ''),
      description,
      dataSourceId: dataSource.id,
      location: {
        x: southExit.x + southExit.width / 2,
        y: southExit.y + southExit.height / 2
      },
      resolved: false,
      isDirty: true,
      mergeError: useBadData ? '检测到数据合并冲突：票务数据缺失15%，可能混入上周历史数据' : undefined,
      expiresAt: context.gameTime + 60,
      choices: exitCongestionTemplate.choicesGenerator(context)
    };
  }

  public createPatrolGapEvent(context: EventContext): GameEvent {
    return this.createEvent(eventTemplates.find(t => t.type === 'patrol_gap')!, context)!;
  }

  public createWeatherChangeEvent(context: EventContext): GameEvent {
    return this.createEvent(eventTemplates.find(t => t.type === 'weather_change')!, context)!;
  }

  public checkMergeError(events: GameEvent[]): { hasError: boolean; message: string } {
    if (events.length < 2) return { hasError: false, message: '' };

    const weatherEvents = events.filter(e => e.type === 'weather_change');
    if (weatherEvents.length >= 2) {
      const timeDiff = Math.abs(weatherEvents[0].timestamp - weatherEvents[1].timestamp);
      if (timeDiff < 60 && weatherEvents[0].severity !== weatherEvents[1].severity) {
        return {
          hasError: true,
          message: '检测到天气数据合并错误：短时间内出现冲突的天气报告'
        };
      }
    }

    const patrolEvents = events.filter(e => e.type === 'patrol_gap');
    if (patrolEvents.length >= 2) {
      const timeDiff = Math.abs(patrolEvents[0].timestamp - patrolEvents[1].timestamp);
      if (timeDiff < 30) {
        return {
          hasError: true,
          message: '检测到巡逻数据合并错误：同一区域重复报告巡逻空窗'
        };
      }
    }

    return { hasError: false, message: '' };
  }
}
