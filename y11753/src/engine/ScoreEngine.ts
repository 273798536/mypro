import { GameState, WeatherType, ScoreResult, ScoreItem, RESOURCE_CONFIG, WEATHER_CONFIG, FAULT_TYPE_CONFIG } from '../types';

export class ScoreEngine {
  static calculateScore(state: GameState): ScoreResult {
    let score = 1000;
    const breakdown: ScoreItem[] = [];

    breakdown.push({
      category: '基础分',
      description: '游戏基础分数',
      points: 1000
    });

    const fixedFaults = state.faults.filter(f => f.status === 'fixed');
    const missedFaults = state.faults.filter(f => f.status === 'missed');
    const pendingFaults = state.faults.filter(f => f.status === 'pending');

    fixedFaults.forEach(fault => {
      const isOnTime = fault.handledAt! <= fault.deadline;
      const points = isOnTime ? 50 : 20;
      score += points;
      breakdown.push({
        category: '故障处理',
        description: `${FAULT_TYPE_CONFIG[fault.type].name} ${isOnTime ? '及时' : '超时'}处理`,
        points
      });
    });

    missedFaults.forEach(fault => {
      score -= 100;
      breakdown.push({
        category: '漏查故障',
        description: `${FAULT_TYPE_CONFIG[fault.type].name} 未及时处理`,
        points: -100
      });
    });

    pendingFaults.forEach(fault => {
      score -= 50;
      breakdown.push({
        category: '未处理故障',
        description: `${FAULT_TYPE_CONFIG[fault.type].name} 仍在等待处理`,
        points: -50
      });
    });

    const efficiency = this.calculateEfficiency(state);
    if (efficiency > 0.8) {
      score += 200;
      breakdown.push({ category: '效率加成', description: '资源利用率>80%', points: 200 });
    } else if (efficiency > 0.6) {
      score += 100;
      breakdown.push({ category: '效率加成', description: '资源利用率>60%', points: 100 });
    } else if (efficiency < 0.3) {
      score -= 100;
      breakdown.push({ category: '效率惩罚', description: '资源利用率<30%', points: -100 });
    }

    if (state.battery > 50) {
      score += 150;
      breakdown.push({ category: '电量管理', description: '剩余电量>50%', points: 150 });
    } else if (state.battery > 30) {
      score += 50;
      breakdown.push({ category: '电量管理', description: '剩余电量>30%', points: 50 });
    } else if (state.battery < 15) {
      score -= 150;
      breakdown.push({ category: '电量管理', description: '剩余电量<15%', points: -150 });
    }

    let goodWeatherDecisions = 0;
    let badWeatherDecisions = 0;

    state.operations.forEach(op => {
      const opTime = op.timestamp;
      const weatherAtTime = this.getWeatherAtTime(state, opTime);
      const weatherConfig = WEATHER_CONFIG[weatherAtTime];
      
      if (op.resourceType === 'drone' && !weatherConfig.droneAllowed) {
        badWeatherDecisions++;
      } else if (op.resourceType === 'drone' && weatherConfig.droneAllowed && weatherAtTime === 'sunny') {
        goodWeatherDecisions++;
      }
    });

    if (goodWeatherDecisions > 0) {
      score += goodWeatherDecisions * 20;
      breakdown.push({ category: '天气应对', description: `${goodWeatherDecisions}次正确利用好天气`, points: goodWeatherDecisions * 20 });
    }

    if (badWeatherDecisions > 0) {
      score -= badWeatherDecisions * 30;
      breakdown.push({ category: '天气应对', description: `${badWeatherDecisions}次恶劣天气错误操作`, points: -badWeatherDecisions * 30 });
    }

    return { totalScore: Math.max(0, score), breakdown };
  }

  private static calculateEfficiency(state: GameState): number {
    const { resources, operations, totalTime } = state;
    if (resources.length === 0 || totalTime === 0) return 0;

    const successfulOps = operations.filter(op => op.result === 'success');
    const totalWorkTime = successfulOps.reduce((sum, op) => {
      const config = RESOURCE_CONFIG[op.resourceType];
      return sum + config.workTime;
    }, 0);

    const maxPossibleWork = resources.length * totalTime * 0.5;
    return maxPossibleWork > 0 ? Math.min(1, totalWorkTime / maxPossibleWork) : 0;
  }

  private static getWeatherAtTime(state: GameState, time: number): WeatherType {
    const weatherChanges = state.events.filter(e => e.type === 'weather_change').sort((a, b) => a.timestamp - b.timestamp);
    let currentWeather = state.weather;
    
    for (const event of weatherChanges) {
      if (event.timestamp <= time) {
        const match = event.message.match(/变为(\S+)/);
        if (match) {
          const weatherMap: Record<string, WeatherType> = {
            '晴天': 'sunny',
            '多云': 'cloudy',
            '雨天': 'rainy',
            '暴风雨': 'stormy'
          };
          currentWeather = weatherMap[match[1]] || currentWeather;
        }
      }
    }
    
    return currentWeather;
  }
}
