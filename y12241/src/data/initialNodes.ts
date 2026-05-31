import { Node } from '../types';

export const initialNodes: Node[] = [
  {
    id: 'A',
    type: 'substation',
    x: 200,
    y: 150,
    powered: false,
    load: 0,
    maxLoad: 3,
    status: 'normal',
    label: '变电站A',
  },
  {
    id: 'B',
    type: 'substation',
    x: 400,
    y: 150,
    powered: false,
    load: 0,
    maxLoad: 3,
    status: 'normal',
    label: '变电站B',
  },
  {
    id: 'C',
    type: 'consumer',
    x: 600,
    y: 150,
    powered: false,
    load: 0,
    maxLoad: 2,
    status: 'normal',
    label: '用户区C',
  },
  {
    id: 'D',
    type: 'substation',
    x: 200,
    y: 350,
    powered: false,
    load: 0,
    maxLoad: 3,
    status: 'normal',
    label: '变电站D',
  },
  {
    id: 'E',
    type: 'consumer',
    x: 400,
    y: 350,
    powered: false,
    load: 0,
    maxLoad: 2,
    status: 'normal',
    label: '用户区E',
  },
  {
    id: 'F',
    type: 'consumer',
    x: 600,
    y: 350,
    powered: false,
    load: 0,
    maxLoad: 2,
    status: 'normal',
    label: '用户区F',
  },
];

export const createInitialState = (): Node[] => {
  return initialNodes.map(node => ({ ...node }));
};
