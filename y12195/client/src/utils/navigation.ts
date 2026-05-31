export type Dimension = 'sample' | 'version' | 'correction' | 'group';

interface DimensionConfig {
  key: Dimension;
  name: string;
  path: string;
  params: string[];
  description: string;
}

export const DIMENSIONS: Record<Dimension, DimensionConfig> = {
  sample: {
    key: 'sample',
    name: '学员样本',
    path: '/students',
    params: ['id', 'level', 'teacherId'],
    description: '查看学员样本详情、预警信息',
  },
  version: {
    key: 'version',
    name: '版本追踪',
    path: '/versions',
    params: ['versionId', 'compareId'],
    description: '追踪预警版本变化、对比分析',
  },
  correction: {
    key: 'correction',
    name: '人工修正',
    path: '/corrections',
    params: ['studentId', 'versionId'],
    description: '人工修正预警分数、查看效果',
  },
  group: {
    key: 'group',
    name: '分组指标',
    path: '/groups',
    params: ['groupBy'],
    description: '按维度分组查看统计指标',
  },
};

export const DIMENSION_LIST: Dimension[] = ['sample', 'version', 'correction', 'group'];

export interface NavigationParams {
  id?: string;
  level?: string;
  teacherId?: string;
  versionId?: string;
  compareId?: string;
  studentId?: string;
  groupBy?: string;
  [key: string]: string | undefined;
}

export function buildLink(dimension: Dimension, params: NavigationParams = {}): string {
  const config = DIMENSIONS[dimension];
  let path = config.path;

  const validParams = config.params;
  const queryParts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (key === 'id' && validParams.includes('id')) {
      path = `${path}/${value}`;
    } else if (validParams.includes(key)) {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }

  if (queryParts.length > 0) {
    path = `${path}?${queryParts.join('&')}`;
  }

  return path;
}

export function getDimensionByPath(path: string): Dimension | null {
  for (const [key, config] of Object.entries(DIMENSIONS)) {
    if (path.startsWith(config.path)) {
      return key as Dimension;
    }
  }
  return null;
}

export function getRelatedDimensions(dimension: Dimension, params: NavigationParams = {}): Array<{ dimension: Dimension; link: string }> {
  const related: Array<{ dimension: Dimension; link: string }> = [];
  const { id, studentId, versionId, teacherId } = params;

  for (const dim of DIMENSION_LIST) {
    if (dim === dimension) continue;

    let linkParams: NavigationParams = {};

    switch (dim) {
      case 'sample':
        if (studentId) {
          linkParams = { id: studentId };
        } else if (id && dimension === 'sample') {
          linkParams = { id };
        }
        if (teacherId) linkParams.teacherId = teacherId;
        break;
      case 'version':
        if (versionId) {
          linkParams = { versionId };
        }
        break;
      case 'correction':
        if (studentId) {
          linkParams = { studentId };
        } else if (id && dimension === 'sample') {
          linkParams = { studentId: id };
        }
        if (versionId) linkParams.versionId = versionId;
        break;
      case 'group':
        break;
    }

    related.push({
      dimension: dim,
      link: buildLink(dim, linkParams),
    });
  }

  return related;
}
