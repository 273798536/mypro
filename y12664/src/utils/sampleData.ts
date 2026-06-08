import type { Cage, LayoutConfig, SampleType } from '@/types';

export const defaultConfig: LayoutConfig = {
  rows: 3,
  cols: 4,
  layers: 2,
  spacingX: 1.2,
  spacingY: 0.8,
  spacingZ: 1.5,
  bounds: {
    minX: -8,
    maxX: 8,
    minY: 0,
    maxY: 6,
    minZ: -8,
    maxZ: 8,
  },
};

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function buildCages(config: LayoutConfig, overrides?: Partial<Record<string, Partial<Cage>>>): Cage[] {
  const cages: Cage[] = [];
  const { rows, cols, layers, spacingX, spacingY, spacingZ } = config;
  const offsetX = ((cols - 1) * spacingX) / 2;
  const offsetZ = ((rows - 1) * spacingZ) / 2;

  for (let l = 0; l < layers; l++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = `cage-${l}-${r}-${c}`;
        const base: Cage = {
          id,
          row: r,
          col: c,
          layer: l,
          x: c * spacingX - offsetX,
          y: l * spacingY + 0.4,
          z: r * spacingZ - offsetZ,
          status: 'normal',
          remark: `笼位 L${l + 1}-R${r + 1}-C${c + 1}`,
        };
        const ov = overrides?.[id];
        cages.push(ov ? { ...base, ...ov } : base);
      }
    }
  }
  return cages;
}

export const normalSample: { config: LayoutConfig; cages: Cage[] } = {
  config: defaultConfig,
  cages: buildCages(defaultConfig),
};

export const pendingSample: { config: LayoutConfig; cages: Cage[] } = (() => {
  const cfg = defaultConfig;
  const overrides: Partial<Record<string, Partial<Cage>>> = {
    'cage-0-1-1': { status: 'pending', remark: '待甲方确认该笼位用途' },
    'cage-0-2-3': { status: 'pending', remark: '动物类型待定' },
    'cage-1-0-2': { status: 'pending', remark: '安装位置需复核' },
  };
  return { config: cfg, cages: buildCages(cfg, overrides) };
})();

export const badSample: { config: LayoutConfig; cages: Cage[] } = (() => {
  const cfg = {
    ...defaultConfig,
    rows: 3,
    cols: 4,
    layers: 2,
  };
  const overrides: Partial<Record<string, Partial<Cage>>> = {
    'cage-0-0-0': { x: -10.5, status: 'error', remark: '越界：X 坐标低于最小值 -8' },
    'cage-0-0-3': { x: 11.2, status: 'error', remark: '越界：X 坐标超出最大值 8' },
    'cage-1-1-1': { y: 9.5, status: 'error', remark: '漂浮：Y 坐标 9.5 远超层高标准，疑似离群点' },
    'cage-0-2-2': { status: 'pending', remark: '待确认是否保留' },
  };
  return { config: cfg, cages: buildCages(cfg, overrides) };
})();

export const sampleData: Record<SampleType, { config: LayoutConfig; cages: Cage[] }> = {
  normal: normalSample,
  pending: pendingSample,
  bad: badSample,
};

export function generateCages(config: LayoutConfig): Cage[] {
  return buildCages(config);
}

export { genId };
