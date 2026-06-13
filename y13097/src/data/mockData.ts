import type {
  Corridor,
  CollisionObject,
  Attachment,
  ViewState,
  CollisionResult,
} from '../types';

export function getInitialCorridors(): Corridor[] {
  return [
    {
      id: 'corridor-001',
      name: '东区货运航线 A-1',
      waypoints: [
        { x: 80, y: 200 },
        { x: 250, y: 180 },
        { x: 400, y: 220 },
        { x: 550, y: 200 },
        { x: 700, y: 240 },
      ],
      width: 60,
      minAltitude: 100,
      maxAltitude: 300,
      sourceAttachmentId: 'att-cad-001',
    },
  ];
}

export function getInitialObjects(): CollisionObject[] {
  return [
    {
      id: 'obj-001',
      name: '信号塔 #T-12',
      type: 'tower',
      layer: 'towers',
      position: { x: 200, y: 190 },
      width: 12,
      height: 12,
      altitude: 280,
      sourceAttachmentId: 'att-cad-001',
      isAbnormal: false,
    },
    {
      id: 'obj-002',
      name: '商业大厦 B座',
      type: 'building',
      layer: 'buildings',
      position: { x: 380, y: 210 },
      width: 40,
      height: 30,
      altitude: 260,
      sourceAttachmentId: 'att-cad-001',
      isAbnormal: false,
    },
    {
      id: 'obj-003',
      name: '高压输电线路 P-7',
      type: 'power_line',
      layer: 'power_lines',
      position: { x: 520, y: 200 },
      width: 8,
      height: 60,
      altitude: 320,
      sourceAttachmentId: 'att-supp-002',
      isAbnormal: true,
      abnormalReason: '晚到附件新增，原报告未包含',
    },
    {
      id: 'obj-004',
      name: '山坡 M-3 制高点',
      type: 'mountain',
      layer: 'mountains',
      position: { x: 640, y: 230 },
      width: 50,
      height: 45,
      altitude: 290,
      sourceAttachmentId: 'att-cad-001',
      isAbnormal: true,
      abnormalReason: '口径变更：标高从250m更新为290m',
    },
    {
      id: 'obj-005',
      name: '科技园办公楼',
      type: 'building',
      layer: 'buildings',
      position: { x: 150, y: 250 },
      width: 35,
      height: 25,
      altitude: 180,
      sourceAttachmentId: 'att-cad-001',
      isAbnormal: false,
    },
    {
      id: 'obj-006',
      name: '临时施工吊塔',
      type: 'tower',
      layer: 'towers',
      position: { x: 450, y: 260 },
      width: 10,
      height: 10,
      altitude: 200,
      sourceAttachmentId: 'att-verbal-003',
      isAbnormal: true,
      abnormalReason: '口头说明新增，无正式图纸',
    },
  ];
}

export function getInitialAttachments(): Attachment[] {
  return [
    {
      id: 'att-cad-001',
      name: '东区规划图 v2.1.dwg',
      type: 'cad_drawing',
      uploadedAt: '2026-06-01 09:30',
      uploadedBy: '设计院 - 王工',
      isLateArrival: false,
      currentVersion: 2,
      notes: '原始基准图纸，包含主要建筑和地形',
      versions: [
        {
          version: 1,
          timestamp: '2026-05-20 14:00',
          author: '设计院 - 王工',
          description: '初始版本',
          changeSummary: '首次提交东区规划图',
          affectedObjectIds: ['obj-001', 'obj-002', 'obj-004', 'obj-005'],
        },
        {
          version: 2,
          timestamp: '2026-06-01 09:30',
          author: '设计院 - 王工',
          description: '标高更新',
          changeSummary: 'M-3山坡标高从250m更新为290m，影响航线净高',
          affectedObjectIds: ['obj-004'],
        },
      ],
    },
    {
      id: 'att-supp-002',
      name: '高压线路补充说明.pdf',
      type: 'supplement',
      uploadedAt: '2026-06-08 16:45',
      uploadedBy: '电力公司 - 李工',
      isLateArrival: true,
      currentVersion: 1,
      notes: '晚到附件：预审开始后第三天提交',
      versions: [
        {
          version: 1,
          timestamp: '2026-06-08 16:45',
          author: '电力公司 - 李工',
          description: '补充提交',
          changeSummary: '新增P-7高压输电线路，线高320m',
          affectedObjectIds: ['obj-003'],
        },
      ],
    },
    {
      id: 'att-verbal-003',
      name: '现场口头说明 - 施工吊塔',
      type: 'verbal_note',
      uploadedAt: '2026-06-10 11:20',
      uploadedBy: '施工方 - 张队长',
      isLateArrival: true,
      currentVersion: 1,
      notes: '临时口头说明，需后续补正式文件',
      versions: [
        {
          version: 1,
          timestamp: '2026-06-10 11:20',
          author: '林姐（记录）',
          description: '口头记录',
          changeSummary: '科技园北侧有临时施工吊塔，高约200m',
          affectedObjectIds: ['obj-006'],
        },
      ],
    },
  ];
}

export function getInitialViewStates(): ViewState[] {
  return [
    {
      id: 'view-default',
      name: '默认视图',
      zoom: 1,
      panX: 0,
      panY: 0,
      visibleLayers: ['corridor', 'buildings', 'towers', 'mountains', 'power_lines'],
      filterStatus: [],
      selectedObjectId: null,
      createdAt: '2026-06-01 10:00',
    },
    {
      id: 'view-abnormal',
      name: '异常对象聚焦',
      zoom: 1.5,
      panX: -50,
      panY: 20,
      visibleLayers: ['corridor', 'buildings', 'towers', 'mountains', 'power_lines'],
      filterStatus: ['danger', 'warning'],
      selectedObjectId: 'obj-003',
      createdAt: '2026-06-10 14:30',
    },
  ];
}

function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distance: number; closestPoint: { x: number; y: number } } {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return {
    distance,
    closestPoint: { x: xx, y: yy },
  };
}

function distanceToCorridor(
  objX: number,
  objY: number,
  corridor: Corridor
): { distance: number; closestSegment: number } {
  let minDistance = Infinity;
  let closestSegment = 0;

  for (let i = 0; i < corridor.waypoints.length - 1; i++) {
    const p1 = corridor.waypoints[i];
    const p2 = corridor.waypoints[i + 1];
    const result = pointToLineDistance(objX, objY, p1.x, p1.y, p2.x, p2.y);
    if (result.distance < minDistance) {
      minDistance = result.distance;
      closestSegment = i;
    }
  }

  return { distance: minDistance, closestSegment };
}

export function calculateCollisions(
  corridor: Corridor,
  objects: CollisionObject[],
  attachments: Attachment[]
): CollisionResult[] {
  return objects.map((obj) => {
    const objCenterX = obj.position.x + obj.width / 2;
    const objCenterY = obj.position.y + obj.height / 2;

    const { distance: distanceFromCorridor } = distanceToCorridor(
      objCenterX,
      objCenterY,
      corridor
    );

    const corridorHalfWidth = corridor.width / 2;
    const objHalfSize = Math.max(obj.width, obj.height) / 2;

    let overlapDistance = 0;
    if (distanceFromCorridor < corridorHalfWidth + objHalfSize) {
      overlapDistance = corridorHalfWidth + objHalfSize - distanceFromCorridor;
    }

    const altitudeConflict =
      obj.altitude >= corridor.minAltitude &&
      obj.altitude <= corridor.maxAltitude;

    const sourceAttachment = attachments.find(
      (a) => a.id === obj.sourceAttachmentId
    );

    const changeHistory = sourceAttachment
      ? sourceAttachment.versions.map((v) => ({
          version: v.version,
          changeSummary: v.changeSummary,
          timestamp: v.timestamp,
          author: v.author,
        }))
      : [];

    const affectedByRecentChange =
      sourceAttachment &&
      sourceAttachment.versions.length > 1 &&
      sourceAttachment.versions.some((v) =>
        v.affectedObjectIds.includes(obj.id)
      );

    let changeImpactDescription: string | null = null;
    if (affectedByRecentChange && sourceAttachment) {
      const affectingVersions = sourceAttachment.versions.filter((v) =>
        v.affectedObjectIds.includes(obj.id)
      );
      if (affectingVersions.length > 0) {
        const latestChange = affectingVersions[affectingVersions.length - 1];
        changeImpactDescription = `来源材料「${sourceAttachment.name}」v${latestChange.version}（${latestChange.timestamp}，${latestChange.author}）变更：${latestChange.changeSummary}，导致本对象预审状态需重新评估`;
      }
    }

    let status: CollisionResult['status'] = 'safe';
    let description = '';
    const nextSteps: string[] = [];

    if (overlapDistance > 0 && altitudeConflict) {
      if (overlapDistance > 20) {
        status = 'danger';
        description = `严重冲突：${obj.name}侵入航线走廊${overlapDistance.toFixed(1)}米，标高${obj.altitude}m处于飞行高度区间[${corridor.minAltitude}-${corridor.maxAltitude}]m内`;
        nextSteps.push(
          '立即通知航线规划部门，确认该障碍物是否在禁飞清单内'
        );
        nextSteps.push(
          '联系障碍物所属单位，核实准确位置和高度数据'
        );
        nextSteps.push('评估调整航线高度或绕行方案的可行性');
      } else {
        status = 'warning';
        description = `存在风险：${obj.name}与航线走廊边缘重叠${overlapDistance.toFixed(1)}米，需重点关注`;
        nextSteps.push('标注为重点关注对象，纳入每日巡检清单');
        nextSteps.push('核实障碍物最新状态，确认是否有施工变动');
        nextSteps.push('准备应急预案，明确突发情况处置流程');
      }
    } else if (overlapDistance > 0 && !altitudeConflict) {
      status = 'warning';
      description = `高度错开：${obj.name}水平位置侵入走廊${overlapDistance.toFixed(1)}米，但标高${obj.altitude}m不在飞行高度区间[${corridor.minAltitude}-${corridor.maxAltitude}]m内`;
      nextSteps.push('确认飞行高度区间的准确性和适用条件');
      nextSteps.push('评估极端天气下飞行高度调整的可能性');
    } else if (distanceFromCorridor < corridorHalfWidth + objHalfSize + 30) {
      status = 'warning';
      description = `接近走廊：${obj.name}距离航线走廊边缘${(distanceFromCorridor - corridorHalfWidth - objHalfSize).toFixed(1)}米`;
      nextSteps.push('纳入定期复核清单，每季度重新评估一次');
      nextSteps.push('确认障碍物周边是否有后续建设计划');
    } else {
      status = 'safe';
      description = `${obj.name}与航线走廊距离安全（垂直距离${distanceFromCorridor.toFixed(1)}米）`;
      nextSteps.push('保持常规监控即可');
    }

    if (changeImpactDescription) {
      nextSteps.unshift(`材料变更影响：${changeImpactDescription}`);
    }

    if (obj.isAbnormal && obj.abnormalReason) {
      nextSteps.unshift(`异常说明：${obj.abnormalReason}，需重点核实材料来源`);
    }

    return {
      objectId: obj.id,
      objectName: obj.name,
      status,
      overlapDistance,
      overlapArea: overlapDistance * obj.height,
      altitudeConflict,
      description,
      nextSteps,
      sourceAttachmentId: sourceAttachment?.id || null,
      sourceAttachmentName: sourceAttachment?.name || null,
      sourceVersion: sourceAttachment?.currentVersion || null,
      isAffectedByChange: affectedByRecentChange || false,
      changeImpactDescription,
      changeHistory,
    };
  });
}
