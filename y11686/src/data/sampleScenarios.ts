import type { ScenarioRecord } from '@/types';
import { generateId } from '@/utils/helpers';

const now = new Date().toISOString();

export const sampleScenarios: ScenarioRecord[] = [
  {
    id: 'sample-normal-' + generateId(),
    name: '正方体截面演示',
    description: '正常的正方体截面教学演示，展示如何用平面切割正方体得到三角形截面。这是一个标准的初中几何教学案例。',
    type: 'normal',
    createdAt: now,
    modifiedAt: now,
    source: '预置样例 - 正常',
    scene: {
      geometries: [
        {
          id: 'geo-cube-1',
          type: 'cube',
          position: [0, 0, 0],
          rotation: [0, 0.785, 0],
          scale: [1, 1, 1],
          color: '#3b82f6',
          opacity: 0.8,
          visible: true,
          name: '正方体ABCD-A\'B\'C\'D\'',
        },
      ],
      rotationAxes: [
        {
          id: 'axis-y-1',
          type: 'y',
          startPoint: [0, -2, 0],
          endPoint: [0, 2, 0],
          visible: true,
          draggable: true,
          color: '#22c55e',
        },
      ],
      sectionPlanes: [
        {
          id: 'plane-1',
          position: [0, 0.5, 0],
          normal: [0, 1, 0],
          visible: true,
          showIntersection: true,
          intersectionColor: '#f97316',
          planeColor: 'rgba(59, 130, 246, 0.3)',
        },
      ],
      annotations: [
        {
          id: 'anno-1',
          position: [1, 1, 1],
          label: 'A点',
          color: '#fbbf24',
          visible: true,
          connectedTo: 'geo-cube-1',
        },
        {
          id: 'anno-2',
          position: [-1, 1, 1],
          label: 'B点',
          color: '#fbbf24',
          visible: true,
          connectedTo: 'geo-cube-1',
        },
        {
          id: 'anno-3',
          position: [1, -1, -1],
          label: 'C点',
          color: '#fbbf24',
          visible: true,
          connectedTo: 'geo-cube-1',
        },
      ],
      camera: {
        position: [5, 3, 5],
        target: [0, 0, 0],
      },
    },
    steps: [
      {
        id: 'step-1',
        stepNumber: 1,
        title: '引入正方体',
        description: '展示正方体ABCD-A\'B\'C\'D\'，引导学生观察正方体的六个面和十二条棱。',
        isActive: true,
        sceneSnapshot: {
          geometries: [
            {
              id: 'geo-cube-1',
              type: 'cube',
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              color: '#3b82f6',
              opacity: 0.8,
              visible: true,
              name: '正方体ABCD-A\'B\'C\'D\'',
            },
          ],
          rotationAxes: [],
          sectionPlanes: [],
          annotations: [],
          camera: {
            position: [5, 3, 5],
            target: [0, 0, 0],
          },
        },
      },
      {
        id: 'step-2',
        stepNumber: 2,
        title: '添加旋转轴',
        description: '通过Y轴旋转正方体，让学生从不同角度观察正方体的结构。',
        isActive: false,
        sceneSnapshot: {
          geometries: [
            {
              id: 'geo-cube-1',
              type: 'cube',
              position: [0, 0, 0],
              rotation: [0, 0.785, 0],
              scale: [1, 1, 1],
              color: '#3b82f6',
              opacity: 0.8,
              visible: true,
              name: '正方体ABCD-A\'B\'C\'D\'',
            },
          ],
          rotationAxes: [
            {
              id: 'axis-y-1',
              type: 'y',
              startPoint: [0, -2, 0],
              endPoint: [0, 2, 0],
              visible: true,
              draggable: true,
              color: '#22c55e',
            },
          ],
          sectionPlanes: [],
          annotations: [],
          camera: {
            position: [5, 3, 5],
            target: [0, 0, 0],
          },
        },
      },
      {
        id: 'step-3',
        stepNumber: 3,
        title: '截面演示',
        description: '用水平面切割正方体，观察截面形状。引导学生思考：当平面经过正方体的三个顶点时，截面是什么形状？',
        isActive: false,
        sceneSnapshot: {
          geometries: [
            {
              id: 'geo-cube-1',
              type: 'cube',
              position: [0, 0, 0],
              rotation: [0, 0.785, 0],
              scale: [1, 1, 1],
              color: '#3b82f6',
              opacity: 0.8,
              visible: true,
              name: '正方体ABCD-A\'B\'C\'D\'',
            },
          ],
          rotationAxes: [
            {
              id: 'axis-y-1',
              type: 'y',
              startPoint: [0, -2, 0],
              endPoint: [0, 2, 0],
              visible: true,
              draggable: true,
              color: '#22c55e',
            },
          ],
          sectionPlanes: [
            {
              id: 'plane-1',
              position: [0, 0.5, 0],
              normal: [0, 1, 0],
              visible: true,
              showIntersection: true,
              intersectionColor: '#f97316',
              planeColor: 'rgba(59, 130, 246, 0.3)',
            },
          ],
          annotations: [
            {
              id: 'anno-1',
              position: [1, 1, 1],
              label: 'A点',
              color: '#fbbf24',
              visible: true,
              connectedTo: 'geo-cube-1',
            },
            {
              id: 'anno-2',
              position: [-1, 1, 1],
              label: 'B点',
              color: '#fbbf24',
              visible: true,
              connectedTo: 'geo-cube-1',
            },
            {
              id: 'anno-3',
              position: [1, -1, -1],
              label: 'C点',
              color: '#fbbf24',
              visible: true,
              connectedTo: 'geo-cube-1',
            },
          ],
          camera: {
            position: [5, 3, 5],
            target: [0, 0, 0],
          },
        },
      },
    ],
    revisionHistory: [
      {
        timestamp: now,
        userId: 'system',
        action: 'create_scenario',
        description: '创建预置样例：正方体截面演示',
      },
    ],
  },

  {
    id: 'sample-boundary-' + generateId(),
    name: '旋转角度边界测试',
    description: '边界情况演示：旋转角度接近360度极限值，用于测试角度越界检测和处理逻辑。',
    type: 'boundary',
    createdAt: now,
    modifiedAt: now,
    source: '预置样例 - 边界',
    scene: {
      geometries: [
        {
          id: 'geo-pyramid-1',
          type: 'pyramid',
          position: [0, 0, 0],
          rotation: [0, 6.10865, 0],
          scale: [1, 1, 1],
          color: '#8b5cf6',
          opacity: 0.85,
          visible: true,
          name: '四棱锥P-ABCD',
        },
      ],
      rotationAxes: [
        {
          id: 'axis-z-1',
          type: 'z',
          startPoint: [0, 0, -2],
          endPoint: [0, 0, 2],
          visible: true,
          draggable: true,
          color: '#3b82f6',
        },
      ],
      sectionPlanes: [],
      annotations: [
        {
          id: 'anno-top',
          position: [0, 1.2, 0],
          label: '顶点P',
          color: '#fbbf24',
          visible: true,
          connectedTo: 'geo-pyramid-1',
        },
      ],
      camera: {
        position: [4, 4, 4],
        target: [0, 0, 0],
      },
    },
    steps: [
      {
        id: 'step-boundary-1',
        stepNumber: 1,
        title: '观察边界角度',
        description: '当前四棱锥绕Y轴旋转了约350度，接近360度边界。注意观察系统如何处理接近极限值的角度。',
        isActive: true,
        sceneSnapshot: {
          geometries: [
            {
              id: 'geo-pyramid-1',
              type: 'pyramid',
              position: [0, 0, 0],
              rotation: [0, 6.10865, 0],
              scale: [1, 1, 1],
              color: '#8b5cf6',
              opacity: 0.85,
              visible: true,
              name: '四棱锥P-ABCD',
            },
          ],
          rotationAxes: [
            {
              id: 'axis-z-1',
              type: 'z',
              startPoint: [0, 0, -2],
              endPoint: [0, 0, 2],
              visible: true,
              draggable: true,
              color: '#3b82f6',
            },
          ],
          sectionPlanes: [],
          annotations: [
            {
              id: 'anno-top',
              position: [0, 1.2, 0],
              label: '顶点P',
              color: '#fbbf24',
              visible: true,
              connectedTo: 'geo-pyramid-1',
            },
          ],
          camera: {
            position: [4, 4, 4],
            target: [0, 0, 0],
          },
        },
      },
    ],
    revisionHistory: [
      {
        timestamp: now,
        userId: 'system',
        action: 'create_scenario',
        description: '创建预置样例：旋转角度边界测试',
      },
    ],
  },

  {
    id: 'sample-error-' + generateId(),
    name: '截面丢失演示',
    description: '错误案例演示：截面平面与几何体无交点，触发错误提示系统。这是一个故意设置的错误场景。',
    type: 'error',
    createdAt: now,
    modifiedAt: now,
    source: '预置样例 - 错误',
    scene: {
      geometries: [
        {
          id: 'geo-cylinder-1',
          type: 'cylinder',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: '#ec4899',
          opacity: 0.8,
          visible: true,
          name: '圆柱体',
        },
      ],
      rotationAxes: [],
      sectionPlanes: [
        {
          id: 'plane-far',
          position: [5, 0, 0],
          normal: [1, 0, 0],
          visible: true,
          showIntersection: true,
          intersectionColor: '#f97316',
          planeColor: 'rgba(236, 72, 153, 0.3)',
        },
      ],
      annotations: [
        {
          id: 'anno-lost',
          position: [8, 0, 0],
          label: '远离的标注',
          color: '#ef4444',
          visible: true,
        },
      ],
      camera: {
        position: [6, 3, 6],
        target: [0, 0, 0],
      },
    },
    steps: [
      {
        id: 'step-error-1',
        stepNumber: 1,
        title: '观察错误场景',
        description: '注意：截面平面位于X=5的位置，距离圆柱体（位于原点）很远，两者没有交点。同时标注点也远离几何体。系统应该检测到这些问题并给出提示。',
        isActive: true,
        sceneSnapshot: {
          geometries: [
            {
              id: 'geo-cylinder-1',
              type: 'cylinder',
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              color: '#ec4899',
              opacity: 0.8,
              visible: true,
              name: '圆柱体',
            },
          ],
          rotationAxes: [],
          sectionPlanes: [
            {
              id: 'plane-far',
              position: [5, 0, 0],
              normal: [1, 0, 0],
              visible: true,
              showIntersection: true,
              intersectionColor: '#f97316',
              planeColor: 'rgba(236, 72, 153, 0.3)',
            },
          ],
          annotations: [
            {
              id: 'anno-lost',
              position: [8, 0, 0],
              label: '远离的标注',
              color: '#ef4444',
              visible: true,
            },
          ],
          camera: {
            position: [6, 3, 6],
            target: [0, 0, 0],
          },
        },
      },
    ],
    revisionHistory: [
      {
        timestamp: now,
        userId: 'system',
        action: 'create_scenario',
        description: '创建预置样例：截面丢失演示',
      },
    ],
  },
];

export const initSampleScenarios = () => {
  const existing = localStorage.getItem('geometry-scenarios');
  if (!existing) {
    localStorage.setItem('geometry-scenarios', JSON.stringify(sampleScenarios));
    return sampleScenarios;
  }
  try {
    const parsed = JSON.parse(existing);
    if (parsed.length === 0) {
      localStorage.setItem('geometry-scenarios', JSON.stringify(sampleScenarios));
      return sampleScenarios;
    }
    return parsed;
  } catch {
    localStorage.setItem('geometry-scenarios', JSON.stringify(sampleScenarios));
    return sampleScenarios;
  }
};
