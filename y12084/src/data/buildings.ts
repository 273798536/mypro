import { Building } from '@/types';

export const mockBuildings: Building[] = [
  {
    id: 'b-001',
    name: '商业综合体A座',
    height: 80,
    position: [0, 0, 0],
    dimensions: [30, 80, 25],
    plotId: 'P-01',
    status: 'proposed',
    source: 'building-team',
    floors: 22,
    function: '商业办公'
  },
  {
    id: 'b-002',
    name: '商业综合体B座',
    height: 65,
    position: [35, 0, 0],
    dimensions: [25, 65, 20],
    plotId: 'P-01',
    status: 'proposed',
    source: 'building-team',
    floors: 18,
    function: '商业办公'
  },
  {
    id: 'b-003',
    name: '住宅楼1号楼',
    height: 54,
    position: [-40, 0, 30],
    dimensions: [20, 54, 15],
    plotId: 'P-02',
    status: 'under-construction',
    source: 'building-team',
    floors: 18,
    function: '住宅'
  },
  {
    id: 'b-004',
    name: '住宅楼2号楼',
    height: 54,
    position: [-15, 0, 30],
    dimensions: [20, 54, 15],
    plotId: 'P-02',
    status: 'under-construction',
    source: 'wind-team',
    floors: 18,
    function: '住宅'
  },
  {
    id: 'b-005',
    name: '文化艺术中心',
    height: 24,
    position: [20, 0, 45],
    dimensions: [40, 24, 35],
    plotId: 'P-03',
    status: 'existing',
    source: 'building-team',
    floors: 5,
    function: '文化'
  },
  {
    id: 'b-006',
    name: '超高层写字楼',
    height: 150,
    position: [60, 0, -30],
    dimensions: [28, 150, 28],
    plotId: 'P-04',
    status: 'proposed',
    source: 'building-team',
    floors: 38,
    function: '办公'
  },
  {
    id: 'b-007',
    name: '酒店公寓',
    height: 72,
    position: [-50, 0, -25],
    dimensions: [22, 72, 18],
    plotId: 'P-05',
    status: 'proposed',
    source: 'wind-team',
    floors: 22,
    function: '酒店'
  },
  {
    id: 'b-008',
    name: '科技研发楼',
    height: 45,
    position: [0, 0, -55],
    dimensions: [35, 45, 20],
    plotId: 'P-06',
    status: 'under-construction',
    source: 'building-team',
    floors: 12,
    function: '研发'
  },
  {
    id: 'b-009',
    name: '社区服务中心',
    height: 18,
    position: [-30, 0, 55],
    dimensions: [25, 18, 20],
    plotId: 'P-07',
    status: 'existing',
    source: 'building-team',
    floors: 4,
    function: '社区服务'
  },
  {
    id: 'b-010',
    name: '购物中心',
    height: 36,
    position: [55, 0, 35],
    dimensions: [45, 36, 40],
    plotId: 'P-08',
    status: 'proposed',
    source: 'building-team',
    floors: 8,
    function: '商业'
  },
  {
    id: 'b-011',
    name: '数据中心',
    height: 30,
    position: [-60, 0, 10],
    dimensions: [30, 30, 25],
    plotId: 'P-09',
    status: 'proposed',
    source: 'wind-team',
    floors: 6,
    function: '数据中心'
  },
  {
    id: 'b-012',
    name: '体育馆',
    height: 28,
    position: [40, 0, -60],
    dimensions: [50, 28, 40],
    plotId: 'P-10',
    status: 'existing',
    source: 'building-team',
    floors: 3,
    function: '体育'
  }
];
