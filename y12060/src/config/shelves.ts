import { Shelf } from '../types/shelf';

export const SHELF_LAYOUTS: Record<string, Shelf[]> = {
  'basic': [
    {
      id: 'shelf-basic-001',
      name: 'A区货架-1号',
      height: 4.0,
      width: 2.5,
      depth: 1.0,
      aisleWidth: 3.0,
      position: { x: -5, z: -5 },
      blindZones: [
        { x: -5, z: -3, radius: 1.5 }
      ],
      maintainer: '仓储部 - 赵主管'
    },
    {
      id: 'shelf-basic-002',
      name: 'A区货架-2号',
      height: 4.0,
      width: 2.5,
      depth: 1.0,
      aisleWidth: 3.0,
      position: { x: 0, z: -5 },
      blindZones: [
        { x: 0, z: -3, radius: 1.5 }
      ],
      maintainer: '仓储部 - 赵主管'
    },
    {
      id: 'shelf-basic-003',
      name: 'A区货架-3号',
      height: 4.0,
      width: 2.5,
      depth: 1.0,
      aisleWidth: 3.0,
      position: { x: 5, z: -5 },
      blindZones: [
        { x: 5, z: -3, radius: 1.5 }
      ],
      maintainer: '仓储部 - 赵主管'
    },
    {
      id: 'shelf-basic-004',
      name: 'B区货架-1号',
      height: 4.0,
      width: 2.5,
      depth: 1.0,
      aisleWidth: 3.0,
      position: { x: -5, z: 5 },
      blindZones: [
        { x: -5, z: 3, radius: 1.5 }
      ],
      maintainer: '仓储部 - 钱主管'
    },
    {
      id: 'shelf-basic-005',
      name: 'B区货架-2号',
      height: 4.0,
      width: 2.5,
      depth: 1.0,
      aisleWidth: 3.0,
      position: { x: 0, z: 5 },
      blindZones: [
        { x: 0, z: 3, radius: 1.5 }
      ],
      maintainer: '仓储部 - 钱主管'
    },
    {
      id: 'shelf-basic-006',
      name: 'B区货架-3号',
      height: 4.0,
      width: 2.5,
      depth: 1.0,
      aisleWidth: 3.0,
      position: { x: 5, z: 5 },
      blindZones: [
        { x: 5, z: 3, radius: 1.5 }
      ],
      maintainer: '仓储部 - 钱主管'
    }
  ],
  'narrow': [
    {
      id: 'shelf-narrow-001',
      name: '高密度货架-1号',
      height: 5.5,
      width: 3.0,
      depth: 1.2,
      aisleWidth: 2.0,
      position: { x: -4, z: -6 },
      blindZones: [
        { x: -4, z: -4, radius: 2.0 },
        { x: -2.5, z: -6, radius: 1.0 }
      ],
      maintainer: '仓储部 - 孙经理'
    },
    {
      id: 'shelf-narrow-002',
      name: '高密度货架-2号',
      height: 5.5,
      width: 3.0,
      depth: 1.2,
      aisleWidth: 2.0,
      position: { x: 0, z: -6 },
      blindZones: [
        { x: 0, z: -4, radius: 2.0 }
      ],
      maintainer: '仓储部 - 孙经理'
    },
    {
      id: 'shelf-narrow-003',
      name: '高密度货架-3号',
      height: 5.5,
      width: 3.0,
      depth: 1.2,
      aisleWidth: 2.0,
      position: { x: 4, z: -6 },
      blindZones: [
        { x: 4, z: -4, radius: 2.0 },
        { x: 2.5, z: -6, radius: 1.0 }
      ],
      maintainer: '仓储部 - 孙经理'
    },
    {
      id: 'shelf-narrow-004',
      name: '高密度货架-4号',
      height: 5.5,
      width: 3.0,
      depth: 1.2,
      aisleWidth: 2.0,
      position: { x: -4, z: 6 },
      blindZones: [
        { x: -4, z: 4, radius: 2.0 }
      ],
      maintainer: '仓储部 - 周经理'
    },
    {
      id: 'shelf-narrow-005',
      name: '高密度货架-5号',
      height: 5.5,
      width: 3.0,
      depth: 1.2,
      aisleWidth: 2.0,
      position: { x: 0, z: 6 },
      blindZones: [
        { x: 0, z: 4, radius: 2.0 }
      ],
      maintainer: '仓储部 - 周经理'
    },
    {
      id: 'shelf-narrow-006',
      name: '高密度货架-6号',
      height: 5.5,
      width: 3.0,
      depth: 1.2,
      aisleWidth: 2.0,
      position: { x: 4, z: 6 },
      blindZones: [
        { x: 4, z: 4, radius: 2.0 }
      ],
      maintainer: '仓储部 - 周经理'
    }
  ],
  'complex': [
    {
      id: 'shelf-complex-001',
      name: '立体库货架-A1',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: -8, z: -8 },
      blindZones: [
        { x: -8, z: -6, radius: 2.5 },
        { x: -6, z: -8, radius: 1.5 }
      ],
      maintainer: '仓储部 - 吴总监'
    },
    {
      id: 'shelf-complex-002',
      name: '立体库货架-A2',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: -3, z: -8 },
      blindZones: [
        { x: -3, z: -6, radius: 2.5 }
      ],
      maintainer: '仓储部 - 吴总监'
    },
    {
      id: 'shelf-complex-003',
      name: '立体库货架-A3',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: 2, z: -8 },
      blindZones: [
        { x: 2, z: -6, radius: 2.5 }
      ],
      maintainer: '仓储部 - 吴总监'
    },
    {
      id: 'shelf-complex-004',
      name: '立体库货架-A4',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: 7, z: -8 },
      blindZones: [
        { x: 7, z: -6, radius: 2.5 },
        { x: 5, z: -8, radius: 1.5 }
      ],
      maintainer: '仓储部 - 吴总监'
    },
    {
      id: 'shelf-complex-005',
      name: '立体库货架-B1',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: -8, z: 0 },
      blindZones: [
        { x: -8, z: 2, radius: 2.5 }
      ],
      maintainer: '仓储部 - 郑总监'
    },
    {
      id: 'shelf-complex-006',
      name: '立体库货架-B2',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: 7, z: 0 },
      blindZones: [
        { x: 7, z: 2, radius: 2.5 }
      ],
      maintainer: '仓储部 - 郑总监'
    },
    {
      id: 'shelf-complex-007',
      name: '立体库货架-C1',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: -8, z: 8 },
      blindZones: [
        { x: -8, z: 6, radius: 2.5 },
        { x: -6, z: 8, radius: 1.5 }
      ],
      maintainer: '仓储部 - 冯总监'
    },
    {
      id: 'shelf-complex-008',
      name: '立体库货架-C2',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: -3, z: 8 },
      blindZones: [
        { x: -3, z: 6, radius: 2.5 }
      ],
      maintainer: '仓储部 - 冯总监'
    },
    {
      id: 'shelf-complex-009',
      name: '立体库货架-C3',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: 2, z: 8 },
      blindZones: [
        { x: 2, z: 6, radius: 2.5 }
      ],
      maintainer: '仓储部 - 冯总监'
    },
    {
      id: 'shelf-complex-010',
      name: '立体库货架-C4',
      height: 7.0,
      width: 3.5,
      depth: 1.5,
      aisleWidth: 2.5,
      position: { x: 7, z: 8 },
      blindZones: [
        { x: 7, z: 6, radius: 2.5 },
        { x: 5, z: 8, radius: 1.5 }
      ],
      maintainer: '仓储部 - 冯总监'
    }
  ]
};

export const DEFAULT_SHELF_LAYOUT = 'basic';
