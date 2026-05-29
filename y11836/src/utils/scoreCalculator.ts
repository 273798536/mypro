import { CellType, Position, ScoreResult, DeductionItem, GRID_SIZE } from '@/types';

interface CellCoverage {
  fire: boolean;
  green: boolean;
}

function createEmptyGrid(): CellType[][] {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(CellType.EMPTY));
}

function getNeighbors(row: number, col: number): Position[] {
  const neighbors: Position[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
      neighbors.push({ row: newRow, col: newCol });
    }
  }
  return neighbors;
}

function isRoad(grid: CellType[][], row: number, col: number): boolean {
  return grid[row][col] === CellType.ROAD;
}

function calculateTrafficScore(grid: CellType[][]): { score: number; maxScore: number; deductions: DeductionItem[] } {
  const deductions: DeductionItem[] = [];
  let maxScore = 100;
  let score = maxScore;

  const roadCells: Position[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (isRoad(grid, row, col)) {
        roadCells.push({ row, col });
      }
    }
  }

  if (roadCells.length === 0) {
    deductions.push({
      category: 'traffic',
      reason: '城市没有道路',
      points: 100,
      description: '你的城市还没有修建任何道路，商业区和住宅区的人们无法出行！',
      positions: []
    });
    return { score: 0, maxScore, deductions };
  }

  const deadEnds: Position[] = [];
  for (const road of roadCells) {
    const neighbors = getNeighbors(road.row, road.col);
    const roadNeighbors = neighbors.filter(n => isRoad(grid, n.row, n.col));
    if (roadNeighbors.length <= 1) {
      deadEnds.push(road);
    }
  }

  if (deadEnds.length > 0) {
    const penalty = Math.min(deadEnds.length * 8, 40);
    deductions.push({
      category: 'traffic',
      reason: `发现 ${deadEnds.length} 处道路断头`,
      points: penalty,
      description: '道路断头意味着车辆进去后只能倒车出来，这会造成交通混乱。建议把道路修得更连通一些。',
      positions: deadEnds
    });
    score -= penalty;
  }

  const visited = new Set<string>();
  const componentSizes: number[] = [];
  
  for (const road of roadCells) {
    const key = `${road.row},${road.col}`;
    if (!visited.has(key)) {
      const queue: Position[] = [road];
      visited.add(key);
      let size = 0;
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        size++;
        const neighbors = getNeighbors(current.row, current.col);
        for (const neighbor of neighbors) {
          const nKey = `${neighbor.row},${neighbor.col}`;
          if (!visited.has(nKey) && isRoad(grid, neighbor.row, neighbor.col)) {
            visited.add(nKey);
            queue.push(neighbor);
          }
        }
      }
      componentSizes.push(size);
    }
  }

  if (componentSizes.length > 1) {
    const disconnectedRoads = roadCells.length - Math.max(...componentSizes);
    const penalty = Math.min(disconnectedRoads * 5, 30);
    deductions.push({
      category: 'traffic',
      reason: '道路网络不连通',
      points: penalty,
      description: '城市中有多段独立的道路，它们之间没有连接。这样人们无法从一个区域开车到另一个区域。',
      positions: roadCells.filter(r => {
        const key = `${r.row},${r.col}`;
        return visited.has(key) && componentSizes.indexOf(componentSizes.find(s => s === componentSizes[0])!) !== 0;
      })
    });
    score -= penalty;
  }

  const commercialCells: Position[] = [];
  const residentialCells: Position[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === CellType.COMMERCIAL) commercialCells.push({ row, col });
      if (grid[row][col] === CellType.RESIDENTIAL) residentialCells.push({ row, col });
    }
  }

  const isolatedBuildings: Position[] = [];
  for (const building of [...commercialCells, ...residentialCells]) {
    const neighbors = getNeighbors(building.row, building.col);
    const hasRoadAccess = neighbors.some(n => isRoad(grid, n.row, n.col));
    if (!hasRoadAccess) {
      isolatedBuildings.push(building);
    }
  }

  if (isolatedBuildings.length > 0) {
    const penalty = Math.min(isolatedBuildings.length * 5, 30);
    deductions.push({
      category: 'traffic',
      reason: `${isolatedBuildings.length} 栋建筑没有道路连接`,
      points: penalty,
      description: '这些建筑旁边没有道路，居民和货物无法进出。记得在每栋建筑旁边修建道路！',
      positions: isolatedBuildings
    });
    score -= penalty;
  }

  return { score: Math.max(0, score), maxScore, deductions };
}

function calculateFireScore(grid: CellType[][]): { score: number; maxScore: number; deductions: DeductionItem[]; coverage: boolean[][] } {
  const deductions: DeductionItem[] = [];
  let maxScore = 100;
  let score = maxScore;

  const coverage: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  const fireStations: Position[] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === CellType.FIRE_STATION) {
        fireStations.push({ row, col });
      }
    }
  }

  if (fireStations.length === 0) {
    deductions.push({
      category: 'fire',
      reason: '城市没有消防站',
      points: 100,
      description: '没有消防站的城市非常危险！一旦发生火灾，整个城市都会被烧毁。请至少修建一个消防站。',
      positions: []
    });
    return { score: 0, maxScore, deductions, coverage };
  }

  const FIRE_COVERAGE_RADIUS = 2;
  for (const station of fireStations) {
    for (let dr = -FIRE_COVERAGE_RADIUS; dr <= FIRE_COVERAGE_RADIUS; dr++) {
      for (let dc = -FIRE_COVERAGE_RADIUS; dc <= FIRE_COVERAGE_RADIUS; dc++) {
        const newRow = station.row + dr;
        const newCol = station.col + dc;
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
          const distance = Math.abs(dr) + Math.abs(dc);
          if (distance <= FIRE_COVERAGE_RADIUS) {
            coverage[newRow][newCol] = true;
          }
        }
      }
    }
  }

  const blindSpots: Position[] = [];
  const importantBuildings: Position[] = [];
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellType = grid[row][col];
      if (cellType === CellType.COMMERCIAL || cellType === CellType.RESIDENTIAL) {
        importantBuildings.push({ row, col });
        if (!coverage[row][col]) {
          blindSpots.push({ row, col });
        }
      }
    }
  }

  if (blindSpots.length > 0) {
    const penalty = Math.min(blindSpots.length * 10, 60);
    deductions.push({
      category: 'fire',
      reason: `消防盲区：${blindSpots.length} 栋建筑`,
      points: penalty,
      description: '这些建筑不在消防站的覆盖范围内（消防站只能覆盖周围2格），一旦着火消防车来不及赶到！',
      positions: blindSpots
    });
    score -= penalty;
  }

  if (fireStations.length < 2 && importantBuildings.length > 15) {
    deductions.push({
      category: 'fire',
      reason: '消防站数量不足',
      points: 20,
      description: '城市建筑很多但消防站太少，万一同时发生多处火灾就忙不过来了。建议多建1-2个消防站。',
      positions: fireStations
    });
    score -= 20;
  }

  return { score: Math.max(0, score), maxScore, deductions, coverage };
}

function calculateGreenScore(grid: CellType[][]): { score: number; maxScore: number; deductions: DeductionItem[]; coverage: boolean[][] } {
  const deductions: DeductionItem[] = [];
  let maxScore = 100;
  let score = maxScore;

  const coverage: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
  const greenSpaces: Position[] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === CellType.GREEN) {
        greenSpaces.push({ row, col });
      }
    }
  }

  const totalCells = GRID_SIZE * GRID_SIZE;
  const greenRatio = greenSpaces.length / totalCells;
  const recommendedRatio = 0.15;

  if (greenSpaces.length === 0) {
    deductions.push({
      category: 'green',
      reason: '城市没有绿地',
      points: 100,
      description: '没有绿地的城市就像一片沙漠！人们需要公园和树木来呼吸新鲜空气、放松心情。',
      positions: []
    });
    return { score: 0, maxScore, deductions, coverage };
  }

  const GREEN_COVERAGE_RADIUS = 2;
  for (const green of greenSpaces) {
    for (let dr = -GREEN_COVERAGE_RADIUS; dr <= GREEN_COVERAGE_RADIUS; dr++) {
      for (let dc = -GREEN_COVERAGE_RADIUS; dc <= GREEN_COVERAGE_RADIUS; dc++) {
        const newRow = green.row + dr;
        const newCol = green.col + dc;
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
          const distance = Math.abs(dr) + Math.abs(dc);
          if (distance <= GREEN_COVERAGE_RADIUS) {
            coverage[newRow][newCol] = true;
          }
        }
      }
    }
  }

  const buildingsWithoutGreen: Position[] = [];
  const allBuildings: Position[] = [];
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellType = grid[row][col];
      if (cellType === CellType.COMMERCIAL || cellType === CellType.RESIDENTIAL) {
        allBuildings.push({ row, col });
        if (!coverage[row][col]) {
          buildingsWithoutGreen.push({ row, col });
        }
      }
    }
  }

  if (buildingsWithoutGreen.length > 0) {
    const penalty = Math.min(buildingsWithoutGreen.length * 6, 50);
    deductions.push({
      category: 'green',
      reason: `${buildingsWithoutGreen.length} 栋建筑附近没有绿地`,
      points: penalty,
      description: '住在这些建筑里的人们散步需要走很远才能看到绿色。绿地应该服务周围的居民（覆盖半径2格）。',
      positions: buildingsWithoutGreen
    });
    score -= penalty;
  }

  if (greenRatio < recommendedRatio && allBuildings.length > 0) {
    const penalty = 20;
    deductions.push({
      category: 'green',
      reason: '绿地比例偏低',
      points: penalty,
      description: `城市中绿地只占 ${(greenRatio * 100).toFixed(0)}%，建议至少达到 15%。多种树可以让城市更宜居！`,
      positions: greenSpaces
    });
    score -= penalty;
  }

  return { score: Math.max(0, score), maxScore, deductions, coverage };
}

export function calculateScore(grid: CellType[][]): ScoreResult {
  const trafficResult = calculateTrafficScore(grid);
  const fireResult = calculateFireScore(grid);
  const greenResult = calculateGreenScore(grid);

  const deductions = [...trafficResult.deductions, ...fireResult.deductions, ...greenResult.deductions];
  
  deductions.sort((a, b) => b.points - a.points);

  const totalScore = Math.round((trafficResult.score + fireResult.score + greenResult.score) / 3);
  const maxScore = 100;

  return {
    totalScore,
    maxScore,
    trafficScore: { score: trafficResult.score, maxScore: trafficResult.maxScore },
    fireScore: { score: fireResult.score, maxScore: fireResult.maxScore },
    greenScore: { score: greenResult.score, maxScore: greenResult.maxScore },
    deductions
  };
}

export function createInitialGrid(): CellType[][] {
  return createEmptyGrid();
}

export function findChangedCells(grid1: CellType[][], grid2: CellType[][]): Position[] {
  const changes: Position[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid1[row][col] !== grid2[row][col]) {
        changes.push({ row, col });
      }
    }
  }
  return changes;
}

export function loadSampleGrid1(): CellType[][] {
  const grid = createEmptyGrid();
  
  grid[2][2] = CellType.COMMERCIAL;
  grid[2][3] = CellType.COMMERCIAL;
  grid[3][2] = CellType.COMMERCIAL;
  
  grid[2][6] = CellType.COMMERCIAL;
  grid[2][7] = CellType.COMMERCIAL;
  
  grid[6][3] = CellType.RESIDENTIAL;
  grid[6][4] = CellType.RESIDENTIAL;
  grid[7][3] = CellType.RESIDENTIAL;
  
  grid[6][6] = CellType.RESIDENTIAL;
  grid[6][7] = CellType.RESIDENTIAL;
  
  grid[4][1] = CellType.ROAD;
  grid[4][2] = CellType.ROAD;
  grid[4][3] = CellType.ROAD;
  grid[4][4] = CellType.ROAD;
  
  grid[1][4] = CellType.ROAD;
  grid[2][4] = CellType.ROAD;
  grid[3][4] = CellType.ROAD;
  grid[5][4] = CellType.ROAD;
  grid[6][4] = CellType.ROAD;
  grid[7][4] = CellType.ROAD;
  
  grid[4][5] = CellType.ROAD;
  grid[4][6] = CellType.ROAD;
  grid[4][7] = CellType.ROAD;
  grid[4][8] = CellType.ROAD;
  
  grid[1][7] = CellType.ROAD;
  grid[2][7] = CellType.ROAD;
  grid[3][7] = CellType.ROAD;
  grid[5][7] = CellType.ROAD;
  grid[6][7] = CellType.ROAD;
  
  return grid;
}

export function loadSampleGrid2(): CellType[][] {
  const grid = loadSampleGrid1();
  
  grid[1][1] = CellType.GREEN;
  grid[1][2] = CellType.GREEN;
  grid[2][1] = CellType.GREEN;
  
  grid[7][7] = CellType.GREEN;
  grid[7][8] = CellType.GREEN;
  grid[8][7] = CellType.GREEN;
  
  grid[1][5] = CellType.FIRE_STATION;
  
  grid[8][4] = CellType.ROAD;
  
  return grid;
}
