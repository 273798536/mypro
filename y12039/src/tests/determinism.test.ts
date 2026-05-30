import { GameEngine } from '../engine/GameEngine';
import { DeterministicRandom } from '../engine/DeterministicRandom';
import { createInitialState } from '../store/useGameStore';
import type { GameState } from '../types/game';

function createFullInitialState(): GameState {
  const baseState = createInitialState(false);
  return {
    ...baseState,
    status: 'idle',
    speed: 1,
    snapshots: [],
    score: 0,
    decisions: [],
    hasPowerNodes: false,
    seed: 42,
    selectedTaskId: null
  };
}

describe('Deterministic Random', () => {
  test('相同种子产生相同序列', () => {
    const rng1 = new DeterministicRandom(42);
    const rng2 = new DeterministicRandom(42);
    
    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());
    
    expect(results1).toEqual(results2);
  });

  test('不同种子产生不同序列', () => {
    const rng1 = new DeterministicRandom(42);
    const rng2 = new DeterministicRandom(43);
    
    const results1 = Array.from({ length: 10 }, () => rng1.next());
    const results2 = Array.from({ length: 10 }, () => rng2.next());
    
    expect(results1).not.toEqual(results2);
  });

  test('重置后产生相同序列', () => {
    const rng = new DeterministicRandom(42);
    const firstRun = Array.from({ length: 5 }, () => rng.next());
    
    rng.reset(42);
    const secondRun = Array.from({ length: 5 }, () => rng.next());
    
    expect(firstRun).toEqual(secondRun);
  });
});

describe('Game Engine Determinism', () => {
  test('相同初始状态和操作产生相同结果', () => {
    const runSimulation = () => {
      const engine = new GameEngine(42);
      let state = createFullInitialState();
      
      for (let i = 0; i < 100; i++) {
        state = engine.update(state, 1);
      }
      
      return {
        score: state.score,
        oxygen: state.resources.oxygen,
        time: state.resources.time,
        penaltiesCount: state.penalties.length
      };
    };
    
    const result1 = runSimulation();
    const result2 = runSimulation();
    
    expect(result1).toEqual(result2);
  });

  test('两次独立运行产生完全相同的结果序列', () => {
    const runSimulation = () => {
      const engine = new GameEngine(42);
      let state = createFullInitialState();
      const states: { oxygen: number; time: number; score: number }[] = [];
      
      for (let i = 0; i < 50; i++) {
        state = engine.update(state, 1);
        states.push({
          oxygen: state.resources.oxygen,
          time: state.resources.time,
          score: state.score
        });
      }
      
      return states;
    };
    
    const states1 = runSimulation();
    const states2 = runSimulation();
    
    states1.forEach((state, i) => {
      expect(state).toEqual(states2[i]);
    });
  });
});

describe('Resource Consumption', () => {
  test('氧气消耗随时间减少', () => {
    const engine = new GameEngine(42);
    let state = createFullInitialState();
    
    const initialOxygen = state.resources.oxygen;
    
    state = engine.update(state, 2);
    
    expect(state.resources.oxygen).toBeLessThan(initialOxygen);
    expect(state.resources.oxygen).toBeGreaterThan(0);
  });

  test('氧气消耗计算正确', () => {
    const engine = new GameEngine(42);
    let state = createFullInitialState();
    
    const initialOxygen = state.resources.oxygen;
    
    state = engine.update(state, 1);
    
    const consumed = initialOxygen - state.resources.oxygen;
    expect(consumed).toBeGreaterThan(0);
    expect(consumed).toBeLessThan(initialOxygen);
  });
});
