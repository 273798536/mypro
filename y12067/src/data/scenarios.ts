import type {
  Scenario,
  FloorPlan,
  Exit,
  CrowdGroup,
  DataIssue,
} from "@/types";

function createGrid(w: number, h: number, obstacles: [number, number][] = []): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      row.push(obstacles.some(([ox, oy]) => ox === x && oy === y) ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

const floor1: FloorPlan = {
  id: "floor-1",
  name: "1F 大厅层",
  width: 20,
  height: 15,
  grid: createGrid(20, 15, [
    [5, 3], [5, 4], [5, 5],
    [14, 3], [14, 4], [14, 5],
    [10, 10], [11, 10], [10, 11], [11, 11],
  ]),
  exits: [
    { id: "exit-1n", x: 10, y: 0, direction: "north", capacity: 60, status: "open" },
    { id: "exit-1s", x: 10, y: 14, direction: "south", capacity: 40, status: "open" },
    { id: "exit-1e", x: 19, y: 7, direction: "east", note: "北侧出口节假日常拥堵", status: "open" },
    { id: "exit-1w", x: 0, y: 7, direction: "west", capacity: 50, status: "open" },
  ],
  elevators: [
    { id: "elev-1a", x: 3, y: 2, floors: [1, 2, 3], capacity: 15, isUsable: true },
    { id: "elev-1b", x: 16, y: 2, floors: [1, 2, 3], capacity: 15, isUsable: true },
  ],
  stairs: [
    { id: "stair-1a", x: 3, y: 12, width: 2, capacity: 30 },
    { id: "stair-1b", x: 16, y: 12, width: 2, capacity: 30 },
  ],
  fireSource: { x: 10, y: 5, radius: 3 },
  notes: "北侧出口节假日常拥堵",
};

const floor2: FloorPlan = {
  id: "floor-2",
  name: "2F 零售层",
  width: 20,
  height: 15,
  grid: createGrid(20, 15, [
    [3, 3], [3, 4], [3, 5], [3, 6],
    [16, 3], [16, 4], [16, 5], [16, 6],
    [9, 8], [10, 8], [9, 9], [10, 9],
  ]),
  exits: [
    { id: "exit-2n", x: 10, y: 0, direction: "north", capacity: 50, status: "open" },
    { id: "exit-2s", x: 10, y: 14, direction: "south" },
  ],
  elevators: [
    { id: "elev-2a", x: 3, y: 2, floors: [1, 2, 3], capacity: 15, isUsable: true },
    { id: "elev-2b", x: 16, y: 2, floors: [1, 2, 3], capacity: 15, isUsable: true },
  ],
  stairs: [
    { id: "stair-2a", x: 3, y: 12, width: 2, capacity: 30 },
    { id: "stair-2b", x: 16, y: 12, width: 2, capacity: 30 },
  ],
  fireSource: { x: 10, y: 3, radius: 2 },
  notes: "南侧出口容量字段缺失，按默认50人/分钟处理",
};

const floor3: FloorPlan = {
  id: "floor-3",
  name: "3F 餐饮层",
  width: 20,
  height: 15,
  grid: createGrid(20, 15, [
    [4, 4], [4, 5], [15, 4], [15, 5],
    [9, 9], [10, 9], [9, 10], [10, 10],
  ]),
  exits: [
    { id: "exit-3n", x: 10, y: 0, direction: "north", capacity: 40, status: "open" },
    { id: "exit-3w", x: 0, y: 7, direction: "west", capacity: 35, status: "open" },
  ],
  elevators: [
    { id: "elev-3a", x: 3, y: 2, floors: [1, 2, 3], capacity: 15, isUsable: true },
    { id: "elev-3b", x: 16, y: 2, floors: [1, 2, 3], capacity: 15, isUsable: true },
  ],
  stairs: [
    { id: "stair-3a", x: 3, y: 12, width: 2, capacity: 30 },
    { id: "stair-3b", x: 16, y: 12, width: 2, capacity: 30 },
  ],
  fireSource: { x: 15, y: 8, radius: 2 },
  notes: "餐饮区午餐时段人流密集",
};

const crowdGroups1: CrowdGroup[] = [
  { id: "cg-1a", floorId: "floor-1", x: 7, y: 3, count: 30, speed: 1.2, targetExitId: "exit-1n" },
  { id: "cg-1b", floorId: "floor-1", x: 12, y: 10, count: 25, speed: 1.0, targetExitId: "exit-1s" },
  { id: "cg-1c", floorId: "floor-1", x: 15, y: 7, count: 20, speed: 0.8, targetExitId: "exit-1e" },
  { id: "cg-1d", floorId: "floor-1", x: 2, y: 7, count: 15, speed: 1.1 },
  { id: "cg-1e", floorId: "floor-1", x: 5, y: 12, count: 20, speed: 0.6, arrivalTime: 15, note: "电影散场晚到人流" },
];

const crowdGroups2: CrowdGroup[] = [
  { id: "cg-2a", floorId: "floor-2", x: 5, y: 5, count: 35, speed: 1.0, targetExitId: "exit-2n" },
  { id: "cg-2b", floorId: "floor-2", x: 15, y: 5, count: 30, speed: 0.9, targetExitId: "exit-2s" },
  { id: "cg-2c", floorId: "floor-2", x: 10, y: 12, count: 25, speed: 0.7 },
  { id: "cg-2d", floorId: "floor-2", x: 8, y: 3, count: 15, speed: 1.3, arrivalTime: 20, note: "特卖区晚到顾客" },
];

const crowdGroups3: CrowdGroup[] = [
  { id: "cg-3a", floorId: "floor-3", x: 5, y: 3, count: 40, speed: 0.8, targetExitId: "exit-3n" },
  { id: "cg-3b", floorId: "floor-3", x: 12, y: 10, count: 35, speed: 0.7, targetExitId: "exit-3w" },
  { id: "cg-3c", floorId: "floor-3", x: 17, y: 5, count: 20, speed: 1.0 },
];

export const scenarios: Scenario[] = [
  {
    id: "scenario-1",
    name: "周末高峰火警",
    description: "周末午后，商场各层人流密集，1F 大厅发生火情。北侧出口有拥堵记录，2F 南侧出口数据缺失，1F 有电影散场晚到人流。需合理管控电梯、及时广播、引导分流。",
    difficulty: "medium",
    floors: [floor1, floor2, floor3],
    crowdGroups: [...crowdGroups1, ...crowdGroups2, ...crowdGroups3],
    timeLimit: 120,
    dataIssues: [
      { type: "missing_exit_field", description: "2F 南侧出口容量字段缺失", affectedId: "exit-2s" },
      { type: "floor_note", description: "1F 北侧出口节假日常拥堵", affectedId: "exit-1e" },
      { type: "floor_note", description: "3F 餐饮区午餐时段人流密集", affectedId: "floor-3" },
      { type: "late_crowd", description: "1F 电影散场晚到人流（第15秒到达）", affectedId: "cg-1e" },
      { type: "late_crowd", description: "2F 特卖区晚到顾客（第20秒到达）", affectedId: "cg-2d" },
    ],
  },
  {
    id: "scenario-2",
    name: "工作日午间疏散",
    description: "工作日午餐时段，餐饮层人流集中，3F 发生小范围火情。出口数量有限，电梯仍可使用但存在误用风险。培训重点：电梯管控时机和广播覆盖。",
    difficulty: "easy",
    floors: [floor1, floor3],
    crowdGroups: [
      ...crowdGroups1.filter((g) => g.id !== "cg-1e"),
      ...crowdGroups3,
    ],
    timeLimit: 90,
    dataIssues: [
      { type: "floor_note", description: "1F 北侧出口节假日常拥堵", affectedId: "exit-1e" },
      { type: "floor_note", description: "3F 餐饮区午餐时段人流密集", affectedId: "floor-3" },
    ],
  },
  {
    id: "scenario-3",
    name: "多点火情高压",
    description: "商场多处同时起火，人群恐慌导致无序移动。多处出口数据异常，晚到人流多。需要快速判断优先疏散区域，果断关闭电梯，全面广播。",
    difficulty: "hard",
    floors: [floor1, floor2, floor3],
    crowdGroups: [
      ...crowdGroups1.map((g) => ({ ...g, count: Math.floor(g.count * 1.5) })),
      ...crowdGroups2.map((g) => ({ ...g, count: Math.floor(g.count * 1.3), arrivalTime: g.arrivalTime ? g.arrivalTime - 5 : undefined })),
      ...crowdGroups3.map((g) => ({ ...g, count: Math.floor(g.count * 1.4) })),
    ],
    timeLimit: 100,
    dataIssues: [
      { type: "missing_exit_field", description: "2F 南侧出口容量字段缺失", affectedId: "exit-2s" },
      { type: "floor_note", description: "1F 北侧出口节假日常拥堵", affectedId: "exit-1e" },
      { type: "late_crowd", description: "1F 电影散场晚到人流", affectedId: "cg-1e" },
      { type: "late_crowd", description: "2F 特卖区晚到顾客", affectedId: "cg-2d" },
    ],
  },
];
