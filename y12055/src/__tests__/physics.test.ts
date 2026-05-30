import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateBuoyancy,
  calculateTotalMass,
  calculateDisplacedVolume,
  getFluidDensity,
} from "../physics/buoyancyEngine";
import {
  checkBoundaries,
  checkDensityZoneChange,
  checkTreasureCollection,
} from "../physics/boundaryDetector";
import { createInitialState, tick } from "../physics/gameEngine";
import type {
  Submarine,
  BallastTank,
  TreasureChest,
  OceanEnvironment,
  GameSettings,
  ActiveInput,
} from "../physics/types";
import {
  GRAVITY,
  WATER_DENSITY,
  OXYGEN_MAX,
  TARGET_DEPTH,
} from "../physics/constants";

function makeSubmarine(overrides: Partial<Submarine> = {}): Submarine {
  return {
    mass: 5000,
    volume: 3.2,
    x: 50,
    y: 5,
    vx: 0,
    vy: 0,
    ...overrides,
  };
}

function makeBallast(overrides: Partial<BallastTank> = {}): BallastTank {
  return {
    maxVolume: 2.5,
    currentWater: 0,
    waterDensity: 1000,
    ...overrides,
  };
}

function makeTreasure(overrides: Partial<TreasureChest> = {}): TreasureChest {
  return {
    id: "t1",
    mass: 500,
    volume: 0.3,
    x: 30,
    y: 25,
    collected: false,
    ...overrides,
  };
}

function makeEnvironment(
  overrides: Partial<OceanEnvironment> = {}
): OceanEnvironment {
  return {
    baseDensity: WATER_DENSITY,
    densityZones: [],
    gravity: GRAVITY,
    maxDepth: 50,
    oxygenRemaining: OXYGEN_MAX,
    ...overrides,
  };
}

const noInput: ActiveInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  fill: false,
  drain: false,
};

describe("浮力计算引擎", () => {
  it("基础浮力计算：F浮 = ρ × g × V排", () => {
    const sub = makeSubmarine({ y: 10 });
    const tank = makeBallast();
    const env = makeEnvironment();
    const result = calculateBuoyancy(sub, tank, null, env, "TEST");

    const expectedBuoyancy = WATER_DENSITY * GRAVITY * (sub.volume + tank.maxVolume);
    expect(result.buoyantForce).toBeCloseTo(expectedBuoyancy, 1);
    expect(result.fluidDensity).toBe(WATER_DENSITY);
    expect(result.gravity).toBe(GRAVITY);
    expect(result.displacedVolume).toBeCloseTo(sub.volume + tank.maxVolume, 3);
  });

  it("压载舱注水增加总质量但不改变排开体积", () => {
    const sub = makeSubmarine({ y: 10 });
    const tankEmpty = makeBallast({ currentWater: 0 });
    const tankFull = makeBallast({ currentWater: 2 });
    const env = makeEnvironment();

    const emptyResult = calculateBuoyancy(sub, tankEmpty, null, env, "TEST");
    const fullResult = calculateBuoyancy(sub, tankFull, null, env, "TEST");

    expect(fullResult.gravitationalForce).toBeGreaterThan(emptyResult.gravitationalForce);
    expect(fullResult.displacedVolume).toBeCloseTo(emptyResult.displacedVolume, 3);
    expect(fullResult.netForce).toBeLessThan(emptyResult.netForce);
  });

  it("宝箱收集后增加质量和排开体积", () => {
    const sub = makeSubmarine({ y: 10 });
    const tank = makeBallast();
    const treasure = makeTreasure({ collected: true });
    const env = makeEnvironment();

    const withoutTreasure = calculateBuoyancy(sub, tank, null, env, "TEST");
    const withTreasure = calculateBuoyancy(sub, tank, treasure, env, "TEST");

    expect(withTreasure.gravitationalForce).toBeGreaterThan(withoutTreasure.gravitationalForce);
    expect(withTreasure.displacedVolume).toBeGreaterThan(withoutTreasure.displacedVolume);
    expect(withTreasure.treasureImpact).toBe(treasure.mass * GRAVITY);
  });

  it("密度突变区域影响浮力计算", () => {
    const sub = makeSubmarine({ y: 25 });
    const tank = makeBallast();
    const envNormal = makeEnvironment();
    const envDense = makeEnvironment({
      densityZones: [{ id: "dz1", startY: 20, endY: 30, density: 1025 }],
    });

    const normalResult = calculateBuoyancy(sub, tank, null, envNormal, "TEST");
    const denseResult = calculateBuoyancy(sub, tank, null, envDense, "TEST");

    expect(denseResult.fluidDensity).toBe(1025);
    expect(denseResult.buoyantForce).toBeGreaterThan(normalResult.buoyantForce);
  });
});

describe("总质量计算", () => {
  it("潜艇质量 + 压载水质量", () => {
    const sub = makeSubmarine();
    const tank = makeBallast({ currentWater: 1 });
    const mass = calculateTotalMass(sub, tank, null);
    expect(mass).toBe(5000 + 1000);
  });

  it("包含宝箱质量", () => {
    const sub = makeSubmarine();
    const tank = makeBallast();
    const treasure = makeTreasure({ collected: true });
    const mass = calculateTotalMass(sub, tank, treasure);
    expect(mass).toBe(5000 + 500);
  });

  it("未收集宝箱不增加质量", () => {
    const sub = makeSubmarine();
    const tank = makeBallast();
    const treasure = makeTreasure({ collected: false });
    const mass = calculateTotalMass(sub, tank, treasure);
    expect(mass).toBe(5000);
  });
});

describe("排开体积计算", () => {
  it("潜艇 + 压载舱最大容积", () => {
    const sub = makeSubmarine();
    const tank = makeBallast({ maxVolume: 2.5 });
    const vol = calculateDisplacedVolume(sub, tank, null);
    expect(vol).toBeCloseTo(3.2 + 2.5, 3);
  });

  it("包含宝箱体积", () => {
    const sub = makeSubmarine();
    const tank = makeBallast();
    const treasure = makeTreasure({ collected: true });
    const vol = calculateDisplacedVolume(sub, tank, treasure);
    expect(vol).toBeCloseTo(3.2 + 2.5 + 0.3, 3);
  });
});

describe("密度查询", () => {
  it("在密度突变区域内返回该区域密度", () => {
    const env = makeEnvironment({
      densityZones: [{ id: "dz1", startY: 20, endY: 30, density: 1025 }],
    });
    expect(getFluidDensity(25, env)).toBe(1025);
  });

  it("在密度突变区域外返回基础密度", () => {
    const env = makeEnvironment({
      densityZones: [{ id: "dz1", startY: 20, endY: 30, density: 1025 }],
    });
    expect(getFluidDensity(10, env)).toBe(WATER_DENSITY);
  });

  it("在区域边界返回区域密度", () => {
    const env = makeEnvironment({
      densityZones: [{ id: "dz1", startY: 20, endY: 30, density: 1025 }],
    });
    expect(getFluidDensity(20, env)).toBe(1025);
    expect(getFluidDensity(30, env)).toBe(1025);
  });
});

describe("边界检测", () => {
  it("到达目标深度时成功", () => {
    const sub = makeSubmarine({ y: TARGET_DEPTH, vy: 0.1 });
    const env = makeEnvironment();
    const result = checkBoundaries(sub, env, [], null, {
      enableDensityZones: true,
      enableOxygen: true,
      enableCollision: true,
    }, TARGET_DEPTH);
    expect(result.triggered).toBe(true);
    expect(result.boundaryType).toBe("SUCCESS");
  });

  it("氧气耗尽时失败", () => {
    const sub = makeSubmarine({ y: 10 });
    const env = makeEnvironment({ oxygenRemaining: 0 });
    const result = checkBoundaries(sub, env, [], null, {
      enableDensityZones: true,
      enableOxygen: true,
      enableCollision: true,
    }, TARGET_DEPTH);
    expect(result.triggered).toBe(true);
    expect(result.boundaryType).toBe("OXYGEN_DEPLETED");
  });

  it("超过最大深度时失败", () => {
    const sub = makeSubmarine({ y: 55 });
    const env = makeEnvironment();
    const result = checkBoundaries(sub, env, [], null, {
      enableDensityZones: true,
      enableOxygen: true,
      enableCollision: true,
    }, TARGET_DEPTH);
    expect(result.triggered).toBe(true);
    expect(result.boundaryType).toBe("EXCEED_MAX_DEPTH");
  });

  it("碰撞障碍物时失败", () => {
    const sub = makeSubmarine({ x: 22, y: 16 });
    const env = makeEnvironment();
    const obstacles = [{ x: 20, y: 15, width: 8, height: 3 }];
    const result = checkBoundaries(sub, env, obstacles, null, {
      enableDensityZones: true,
      enableOxygen: true,
      enableCollision: true,
    }, TARGET_DEPTH);
    expect(result.triggered).toBe(true);
    expect(result.boundaryType).toBe("COLLISION");
  });

  it("碰撞检测禁用时不触发碰撞", () => {
    const sub = makeSubmarine({ x: 22, y: 16 });
    const env = makeEnvironment();
    const obstacles = [{ x: 20, y: 15, width: 8, height: 3 }];
    const result = checkBoundaries(sub, env, obstacles, null, {
      enableDensityZones: true,
      enableOxygen: true,
      enableCollision: false,
    }, TARGET_DEPTH);
    expect(result.triggered).toBe(false);
  });
});

describe("密度突变区域变化检测", () => {
  it("从正常区域进入密度突变区域", () => {
    const env = makeEnvironment({
      densityZones: [{ id: "dz1", startY: 20, endY: 30, density: 1025 }],
    });
    const result = checkDensityZoneChange(15, 25, env);
    expect(result.entered).toBe(true);
  });

  it("从密度突变区域离开", () => {
    const env = makeEnvironment({
      densityZones: [{ id: "dz1", startY: 20, endY: 30, density: 1025 }],
    });
    const result = checkDensityZoneChange(25, 15, env);
    expect(result.exited).toBe(true);
  });
});

describe("宝箱收集检测", () => {
  it("靠近宝箱时触发收集", () => {
    const sub = makeSubmarine({ x: 30, y: 25 });
    const treasure = makeTreasure({ x: 30, y: 25 });
    expect(checkTreasureCollection(sub, treasure)).toBe(true);
  });

  it("远离宝箱时不触发收集", () => {
    const sub = makeSubmarine({ x: 50, y: 5 });
    const treasure = makeTreasure({ x: 30, y: 25 });
    expect(checkTreasureCollection(sub, treasure)).toBe(false);
  });

  it("已收集的宝箱不触发", () => {
    const sub = makeSubmarine({ x: 30, y: 25 });
    const treasure = makeTreasure({ x: 30, y: 25, collected: true });
    expect(checkTreasureCollection(sub, treasure)).toBe(false);
  });
});

describe("确定性测试：重复运行结果一致", () => {
  it("相同输入序列两次运行结果完全一致", () => {
    function runGame(): { frames: number; finalY: number; finalBuoyancy: number }[] {
      const settings: GameSettings = {
        enableDensityZones: true,
        enableOxygen: true,
        enableCollision: true,
        withTreasure: false,
      };
      const state = createInitialState(settings);
      (state as { phase: string }).phase = "playing";
      const results: { frames: number; finalY: number; finalBuoyancy: number }[] = [];

      const fillInput: ActiveInput = { ...noInput, fill: true };
      for (let i = 0; i < 120; i++) {
        tick(state, i < 30 ? fillInput : noInput);
        if ((state as { phase: string }).phase === "ended") break;
      }

      results.push({
        frames: state.frame,
        finalY: state.submarine.y,
        finalBuoyancy: state.buoyancy.buoyantForce,
      });

      return results;
    }

    const run1 = runGame();
    const run2 = runGame();

    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].frames).toBe(run2[i].frames);
      expect(run1[i].finalY).toBeCloseTo(run2[i].finalY, 10);
      expect(run1[i].finalBuoyancy).toBeCloseTo(run2[i].finalBuoyancy, 10);
    }
  });

  it("含宝箱模式重复运行结果一致", () => {
    function runTreasureGame(): { frames: number; finalY: number; treasureImpact: number } {
      const settings: GameSettings = {
        enableDensityZones: true,
        enableOxygen: true,
        enableCollision: true,
        withTreasure: true,
      };
      const state = createInitialState(settings);
      (state as { phase: string }).phase = "playing";

      const downInput: ActiveInput = { ...noInput, down: true };
      const fillInput: ActiveInput = { ...noInput, fill: true };

      for (let i = 0; i < 60; i++) {
        const input = i < 20 ? fillInput : i < 40 ? downInput : noInput;
        tick(state, input);
        if ((state as { phase: string }).phase === "ended") break;
      }

      return {
        frames: state.frame,
        finalY: state.submarine.y,
        treasureImpact: state.buoyancy.treasureImpact,
      };
    }

    const run1 = runTreasureGame();
    const run2 = runTreasureGame();

    expect(run1.frames).toBe(run2.frames);
    expect(run1.finalY).toBeCloseTo(run2.finalY, 10);
    expect(run1.treasureImpact).toBeCloseTo(run2.treasureImpact, 10);
  });
});

describe("游戏引擎tick测试", () => {
  it("注水后潜艇下沉", () => {
    const settings: GameSettings = {
      enableDensityZones: false,
      enableOxygen: false,
      enableCollision: false,
      withTreasure: false,
    };
    const state = createInitialState(settings);
    (state as { phase: string }).phase = "playing";

    const fillInput: ActiveInput = { ...noInput, fill: true };
    for (let i = 0; i < 120; i++) {
      tick(state, fillInput);
      if ((state as { phase: string }).phase === "ended") break;
    }

    expect(state.ballastTank.currentWater).toBeGreaterThan(0);
    expect(state.submarine.y).toBeGreaterThan(0);
  });

  it("排水后潜艇上浮趋势", () => {
    const settings: GameSettings = {
      enableDensityZones: false,
      enableOxygen: false,
      enableCollision: false,
      withTreasure: false,
    };
    const state = createInitialState(settings);
    (state as { phase: string }).phase = "playing";
    state.ballastTank.currentWater = 2.0;
    state.submarine.y = 20;

    const drainInput: ActiveInput = { ...noInput, drain: true };

    for (let i = 0; i < 30; i++) {
      tick(state, drainInput);
      if ((state as { phase: string }).phase === "ended") break;
    }

    expect(state.ballastTank.currentWater).toBeLessThan(2.0);
  });
});
