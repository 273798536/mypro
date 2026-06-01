export const stageConfig = {
  id: 'stage_main_001',
  name: '巡演A站 - 主舞台',
  version: 'v2.3.1',
  lastModified: '2026-06-01 14:30',
  dimensions: {
    width: 16,
    depth: 12,
    height: 8
  },
  boundaryWarnings: {
    maxHeight: 7.5,
    minDistance: 0.5
  }
}

export const lightingFixtures = [
  {
    id: 'light_001',
    name: '摇头灯-左前',
    type: 'moving_head',
    position: { x: -5, y: 6, z: 4 },
    rotation: { x: -30, y: 20, z: 0 },
    beamAngle: 25,
    power: 470,
    status: 'normal'
  },
  {
    id: 'light_002',
    name: '摇头灯-右前',
    type: 'moving_head',
    position: { x: 5, y: 6, z: 4 },
    rotation: { x: -30, y: -20, z: 0 },
    beamAngle: 25,
    power: 470,
    status: 'normal'
  },
  {
    id: 'light_003',
    name: 'PAR灯-舞台左',
    type: 'par',
    position: { x: -6, y: 4, z: 0 },
    rotation: { x: -45, y: 0, z: 0 },
    beamAngle: 40,
    power: 230,
    status: 'normal'
  },
  {
    id: 'light_004',
    name: 'PAR灯-舞台右',
    type: 'par',
    position: { x: 6, y: 4, z: 0 },
    rotation: { x: -45, y: 0, z: 0 },
    beamAngle: 40,
    power: 230,
    status: 'warning'
  },
  {
    id: 'light_005',
    name: '追光灯-中心',
    type: 'spot',
    position: { x: 0, y: 7, z: 5 },
    rotation: { x: -60, y: 0, z: 0 },
    beamAngle: 15,
    power: 1200,
    status: 'normal'
  },
  {
    id: 'light_006',
    name: 'LED条-背景上',
    type: 'led_bar',
    position: { x: 0, y: 5.5, z: -5.5 },
    rotation: { x: 0, y: 0, z: 0 },
    beamAngle: 120,
    power: 150,
    status: 'normal'
  }
]

export const riggingPoints = [
  {
    id: 'rig_001',
    name: '主吊杆-前',
    position: { x: 0, y: 7.2, z: 3 },
    length: 14,
    height: 7.2,
    load: 250,
    maxHeight: 7.5,
    status: 'warning'
  },
  {
    id: 'rig_002',
    name: '主吊杆-中',
    position: { x: 0, y: 6.5, z: 0 },
    length: 14,
    height: 6.5,
    load: 180,
    maxHeight: 7.5,
    status: 'normal'
  },
  {
    id: 'rig_003',
    name: '侧吊杆-左',
    position: { x: -7, y: 6, z: 0 },
    length: 8,
    height: 6,
    load: 120,
    maxHeight: 7.5,
    status: 'normal'
  },
  {
    id: 'rig_004',
    name: '侧吊杆-右',
    position: { x: 7, y: 6, z: 0 },
    length: 8,
    height: 6,
    load: 120,
    maxHeight: 7.5,
    status: 'normal'
  }
]

export const actorRoutes = [
  {
    id: 'route_001',
    name: '主唱-出场路线',
    actor: '主唱',
    color: '#ff6b6b',
    waypoints: [
      { x: 0, y: 0, z: 6, time: 0 },
      { x: 0, y: 0, z: 2, time: 3 },
      { x: -2, y: 0, z: -1, time: 6 }
    ]
  },
  {
    id: 'route_002',
    name: '吉他手-移动路线',
    actor: '吉他手',
    color: '#4ecdc4',
    waypoints: [
      { x: -4, y: 0, z: -2, time: 0 },
      { x: -2, y: 0, z: 1, time: 5 },
      { x: -3, y: 0, z: 3, time: 8 }
    ]
  },
  {
    id: 'route_003',
    name: '舞者-交叉路线',
    actor: '舞者A',
    color: '#ffe66d',
    waypoints: [
      { x: 3, y: 0, z: 4, time: 0 },
      { x: 0, y: 0, z: 0, time: 4 },
      { x: -3, y: 0, z: -3, time: 8 }
    ]
  }
]

export const stageProps = [
  {
    id: 'prop_001',
    name: '主唱麦架',
    type: 'mic_stand',
    position: { x: 0, y: 0, z: -2 },
    size: { x: 0.5, y: 1.8, z: 0.5 }
  },
  {
    id: 'prop_002',
    name: '吉他音箱',
    type: 'amp',
    position: { x: -5, y: 0, z: -3 },
    size: { x: 0.8, y: 1.2, z: 0.6 }
  },
  {
    id: 'prop_003',
    name: '鼓组',
    type: 'drum_set',
    position: { x: 4, y: 0, z: -4 },
    size: { x: 2.5, y: 1.5, z: 2 }
  }
]
