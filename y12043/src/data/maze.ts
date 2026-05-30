import { Maze } from '@/types';

export const defaultMaze: Maze = {
  id: 'maze-default',
  startNode: 'node-start',
  endNode: 'node-end',
  totalSteps: 8,
  nodes: {
    'node-start': {
      id: 'node-start',
      x: 0,
      y: 2,
      type: 'start',
      connections: [
        { branch: 'A', nodeId: 'node-choice-1' },
      ],
    },
    'node-choice-1': {
      id: 'node-choice-1',
      x: 1,
      y: 2,
      type: 'choice',
      connections: [
        { branch: 'A', nodeId: 'node-gate-1' },
        { branch: 'B', nodeId: 'node-gate-1' },
        { branch: 'C', nodeId: 'node-gate-1' },
      ],
    },
    'node-gate-1': {
      id: 'node-gate-1',
      x: 2,
      y: 2,
      type: 'industry_gate',
      industryGateId: 'gate-tech',
      connections: [
        { branch: 'A', nodeId: 'node-choice-2' },
        { branch: 'B', nodeId: 'node-event-1' },
      ],
    },
    'node-event-1': {
      id: 'node-event-1',
      x: 3,
      y: 1,
      type: 'event',
      eventType: 'market_crash',
      connections: [
        { branch: 'A', nodeId: 'node-choice-2' },
      ],
    },
    'node-choice-2': {
      id: 'node-choice-2',
      x: 3,
      y: 2,
      type: 'choice',
      connections: [
        { branch: 'A', nodeId: 'node-gate-2' },
        { branch: 'B', nodeId: 'node-gate-2' },
        { branch: 'C', nodeId: 'node-gate-2' },
      ],
    },
    'node-gate-2': {
      id: 'node-gate-2',
      x: 4,
      y: 2,
      type: 'industry_gate',
      industryGateId: 'gate-consumer',
      connections: [
        { branch: 'A', nodeId: 'node-choice-3' },
        { branch: 'B', nodeId: 'node-event-2' },
      ],
    },
    'node-event-2': {
      id: 'node-event-2',
      x: 5,
      y: 3,
      type: 'event',
      eventType: 'fee_surge',
      connections: [
        { branch: 'A', nodeId: 'node-choice-3' },
      ],
    },
    'node-choice-3': {
      id: 'node-choice-3',
      x: 5,
      y: 2,
      type: 'choice',
      connections: [
        { branch: 'A', nodeId: 'node-gate-3' },
        { branch: 'B', nodeId: 'node-gate-3' },
        { branch: 'C', nodeId: 'node-gate-3' },
      ],
    },
    'node-gate-3': {
      id: 'node-gate-3',
      x: 6,
      y: 2,
      type: 'industry_gate',
      industryGateId: 'gate-overall',
      connections: [
        { branch: 'A', nodeId: 'node-choice-4' },
        { branch: 'B', nodeId: 'node-event-3' },
      ],
    },
    'node-event-3': {
      id: 'node-event-3',
      x: 7,
      y: 1,
      type: 'event',
      eventType: 'black_swan',
      connections: [
        { branch: 'A', nodeId: 'node-choice-4' },
      ],
    },
    'node-choice-4': {
      id: 'node-choice-4',
      x: 7,
      y: 2,
      type: 'choice',
      connections: [
        { branch: 'A', nodeId: 'node-end' },
        { branch: 'B', nodeId: 'node-end' },
        { branch: 'C', nodeId: 'node-end' },
      ],
    },
    'node-end': {
      id: 'node-end',
      x: 8,
      y: 2,
      type: 'end',
      connections: [],
    },
  },
};
