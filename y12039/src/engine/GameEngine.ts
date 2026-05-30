import type { GameState, Task, Module, Alert, GameSnapshot, Staff } from '../types/game';
import { DeterministicRandom } from './DeterministicRandom';
import { detectConflicts, checkTaskDeadlines, checkStaffFatigue } from './ConflictDetector';
import { calculateResourceConsumption, checkResourceAlerts, updateStaffFatigue } from './ResourceManager';

export class GameEngine {
  private random: DeterministicRandom;
  private lastAlertTime: Map<string, number> = new Map();

  constructor(seed: number) {
    this.random = new DeterministicRandom(seed);
  }

  reset(seed: number): void {
    this.random.reset(seed);
    this.lastAlertTime.clear();
  }

  update(state: GameState, deltaTime: number): Partial<GameState> {
    const actualDelta = deltaTime * state.speed;
    const currentTime = state.resources.time + actualDelta;

    if (currentTime >= state.resources.maxTime) {
      return {
        status: 'finished',
        resources: { ...state.resources, time: state.resources.maxTime }
      };
    }

    const { oxygen, power } = calculateResourceConsumption(
      state.resources,
      state.modules,
      state.staff,
      state.tasks,
      actualDelta
    );

    const updatedStaff = updateStaffFatigue(state.staff, actualDelta);

    const { tasks: updatedTasks, modules: updatedModules, completedScore } = this.updateTasks(
      state.tasks,
      state.modules,
      updatedStaff,
      actualDelta,
      currentTime
    );

    const newAlerts: Alert[] = [];
    const newPenalties: Alert[] = [];

    const resourceAlerts = checkResourceAlerts({ ...state.resources, oxygen, power }, currentTime);
    const conflictAlerts = detectConflicts(updatedTasks, updatedStaff, currentTime);
    const deadlineAlerts = checkTaskDeadlines(updatedTasks, currentTime);
    const fatigueAlerts = checkStaffFatigue(updatedStaff, currentTime);

    const allAlerts = [...resourceAlerts, ...conflictAlerts, ...deadlineAlerts, ...fatigueAlerts];
    allAlerts.forEach(alert => {
      const alertKey = `${alert.type}-${alert.relatedTaskId || alert.relatedStaffId || alert.relatedModuleId || 'global'}`;
      const lastTime = this.lastAlertTime.get(alertKey) || -Infinity;
      const cooldown = alert.severity === 'critical' ? 10 : 30;
      
      if (currentTime - lastTime >= cooldown) {
        newAlerts.push(alert);
        this.lastAlertTime.set(alertKey, currentTime);
        if (alert.penalty > 0) {
          newPenalties.push(alert);
        }
      }
    });

    const totalPenalty = newPenalties.reduce((sum, a) => sum + a.penalty, 0);
    const newScore = state.score + completedScore - totalPenalty;

    const finalTasks = updatedTasks.map(task => {
      if ((task.status === 'pending' || task.status === 'in_progress') && task.deadline <= currentTime) {
        return { ...task, status: 'failed' as const };
      }
      return task;
    });

    return {
      resources: {
        ...state.resources,
        oxygen,
        power,
        time: currentTime
      },
      staff: updatedStaff,
      tasks: finalTasks,
      modules: updatedModules,
      alerts: [...state.alerts.slice(-50), ...newAlerts],
      penalties: [...state.penalties, ...newPenalties],
      score: Math.max(0, newScore)
    };
  }

  private updateTasks(
    tasks: Task[],
    modules: Module[],
    staff: Staff[],
    deltaTime: number,
    currentTime: number
  ): { tasks: Task[]; modules: Module[]; completedScore: number } {
    let completedScore = 0;
    const updatedModules = [...modules];

    const updatedTasks = tasks.map(task => {
      if (task.status !== 'in_progress' || !task.startTime) {
        return task;
      }

      const assignedStaff = staff.filter(s => task.assignedStaff.includes(s.id));
      const hasExhausted = assignedStaff.some(s => s.status === 'exhausted');
      const efficiencyMultiplier = hasExhausted ? 0.5 : 1;

      const skillMatch = assignedStaff.every(s => this.skillLevel(s.skill) >= this.skillLevel(task.requiredSkill));
      const skillBonus = skillMatch ? 1 : 0.7;

      const effectiveDelta = deltaTime * efficiencyMultiplier * skillBonus;
      const elapsedTime = currentTime - task.startTime + effectiveDelta;

      if (elapsedTime >= task.duration) {
        completedScore += this.getTaskScore(task);

        const moduleIndex = updatedModules.findIndex(m => m.id === task.moduleId);
        if (moduleIndex !== -1) {
          updatedModules[moduleIndex] = {
            ...updatedModules[moduleIndex],
            status: 'repaired'
          };
        }

        return { ...task, status: 'completed' as const };
      }

      return task;
    });

    return { tasks: updatedTasks, modules: updatedModules, completedScore };
  }

  private skillLevel(skill: string): number {
    const levels: Record<string, number> = { basic: 1, advanced: 2, expert: 3 };
    return levels[skill] || 1;
  }

  private getTaskScore(task: Task): number {
    const baseScores: Record<string, number> = {
      low: 50,
      medium: 100,
      high: 200,
      critical: 350
    };
    return baseScores[task.priority] || 100;
  }

  createSnapshot(state: GameState): GameSnapshot {
    return {
      timestamp: state.resources.time,
      resources: JSON.parse(JSON.stringify(state.resources)),
      modules: JSON.parse(JSON.stringify(state.modules)),
      tasks: JSON.parse(JSON.stringify(state.tasks)),
      staff: JSON.parse(JSON.stringify(state.staff)),
      alerts: JSON.parse(JSON.stringify(state.alerts.slice(-10))),
      score: state.score
    };
  }

  calculateDecisionEfficiency(
    task: Task,
    staffIds: string[],
    allStaff: Staff[]
  ): number {
    const assignedStaff = allStaff.filter(s => staffIds.includes(s.id));
    if (assignedStaff.length === 0) return 0;

    const skillMatch = assignedStaff.filter(s =>
      this.skillLevel(s.skill) >= this.skillLevel(task.requiredSkill)
    ).length / assignedStaff.length;

    const avgFatigue = assignedStaff.reduce((sum, s) =>
      sum + (1 - s.fatigue / s.maxFatigue), 0) / assignedStaff.length;

    return skillMatch * 0.6 + avgFatigue * 0.4;
  }
}
