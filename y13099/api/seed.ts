import { db, jsonStringify } from "./db.ts";
import crypto from "crypto";

function uuid(): string {
  return crypto.randomUUID();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function offsetDate(days: number, hours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() + hours);
  return d.toISOString().replace("T", " ").substring(0, 19);
}

const CORRIDORS = [
  { code: "LCX-A01", name: "京城西低空A01走廊", segments: 8 },
  { code: "LCX-B02", name: "京城西低空B02走廊", segments: 6 },
  { code: "LCT-C03", name: "京城通低空C03走廊", segments: 10 },
  { code: "LCA-D04", name: "京城安低空D04走廊", segments: 7 },
  { code: "LCB-E05", name: "京城北低空E05走廊", segments: 5 },
];

const SENSOR_TYPES = [
  { type: "altimeter", unit: "m", name: "高度计" },
  { type: "airspeed", unit: "km/h", name: "空速传感器" },
  { type: "temperature", unit: "°C", name: "温度传感器" },
  { type: "humidity", unit: "%RH", name: "湿度传感器" },
  { type: "air_quality", unit: "AQI", name: "空气质量" },
  { type: "obstacle_radar", unit: "m", name: "障碍物雷达" },
];

const STATUSES: Array<"pass" | "supplement" | "exception" | "withdrawn"> = [
  "pass",
  "supplement",
  "exception",
  "withdrawn",
  "pass",
  "supplement",
  "pass",
  "exception",
];

function insertSensorRecords(planId: string, segmentCount: number): string[] {
  const sensorIds: string[] = [];
  const insertSensor = db.prepare(`
    INSERT INTO sensor_record (id, device_code, type, timestamp, raw_reading, unit, corridor_segment_index, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (let seg = 0; seg < segmentCount; seg++) {
    SENSOR_TYPES.forEach((sensor) => {
      const id = uuid();
      sensorIds.push(id);
      const deviceCode = `DEV-${sensor.type.toUpperCase()}-${String(
        randomInt(100, 999)
      )}`;
      let reading = 0;
      if (sensor.type === "altimeter") reading = randomFloat(100, 500);
      else if (sensor.type === "airspeed") reading = randomFloat(60, 150);
      else if (sensor.type === "temperature") reading = randomFloat(5, 35);
      else if (sensor.type === "humidity") reading = randomFloat(20, 85);
      else if (sensor.type === "air_quality") reading = randomInt(30, 180);
      else if (sensor.type === "obstacle_radar") reading = randomFloat(50, 500);

      insertSensor.run(
        id,
        deviceCode,
        sensor.type,
        offsetDate(randomInt(1, 3), randomInt(0, 20)),
        reading,
        sensor.unit,
        seg,
        jsonStringify({
          sensorName: sensor.name,
          calibrationStatus: "ok",
          confidence: randomFloat(0.9, 0.99),
        })
      );
    });
  }
  return sensorIds;
}

function insertPlan(
  corridor: { code: string; name: string; segments: number },
  index: number
): string {
  const planId = uuid();
  const status = STATUSES[index % STATUSES.length];
  const daysAgo = randomInt(2, 20);
  const insertPlan = db.prepare(`
    INSERT INTO plan (id, corridor_code, corridor_name, status, sensor_source_summary, conclusion_summary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sensorSourceSummary = `多源传感器融合（${SENSOR_TYPES.map((s) => s.name).join("、")}），共采集${corridor.segments * 6}条原始读数`;
  let conclusionSummary = "";
  if (status === "pass") {
    conclusionSummary = "数据完整、航段清晰、无冲突，可正常放行";
  } else if (status === "supplement") {
    conclusionSummary = "中段航迹存在漂移，需补充二次雷达校验数据";
  } else if (status === "exception") {
    conclusionSummary = "第3航段障碍物雷达读数异常，疑似存在临时障碍物";
  } else {
    conclusionSummary = "因空域协调冲突，已撤回并进入重新评估流程";
  }

  insertPlan.run(
    planId,
    corridor.code,
    corridor.name,
    status,
    sensorSourceSummary,
    conclusionSummary,
    offsetDate(daysAgo),
    offsetDate(daysAgo - 1)
  );

  const sensorIds = insertSensorRecords(planId, corridor.segments);

  const insertNode = db.prepare(`
    INSERT INTO timeline_node (id, plan_id, type, title, timestamp, sensor_record_id, corridor_segment_index, detail_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  type TimelineSeedItem = {
    type: "created" | "sensor_collect" | "first_review" | "rejudge" | "withdrawn" | "final_review";
    title: string;
    daysOffset: number;
    detail: Record<string, unknown>;
    sensorId: string | null;
    segment: number | null;
  };

  const timeline: TimelineSeedItem[] = [
    {
      type: "created",
      title: "方案创建",
      daysOffset: daysAgo,
      detail: {
        operator: "方案经理-小赵",
        remark: "初始方案提交",
      },
      sensorId: null,
      segment: null,
    },
    {
      type: "sensor_collect",
      title: "传感器采集",
      daysOffset: daysAgo - 0.5,
      detail: {
        deviceCount: SENSOR_TYPES.length,
        segmentCount: corridor.segments,
        totalRecords: corridor.segments * 6,
      },
      sensorId: sensorIds[0],
      segment: 0,
    },
    {
      type: "first_review",
      title: "初审完成",
      daysOffset: daysAgo - 1,
      detail: {
        reviewer: "李工",
        preliminaryResult: status === "withdrawn" ? "建议暂缓" : "待终审",
        remark:
          status === "supplement"
            ? "部分读数存在疑问，需复核"
            : status === "exception"
            ? "雷达数据异常，需排查"
            : "数据整体正常",
      },
      sensorId: sensorIds[randomInt(5, 15)],
      segment: randomInt(1, corridor.segments - 1),
    },
  ];

  if (status === "withdrawn") {
    timeline.push({
      type: "withdrawn",
      title: "方案撤回",
      daysOffset: daysAgo - 1.5,
      detail: {
        operator: "方案经理-小赵",
        reason:
          "空域协调出现冲突，与相邻管制区临时活动重叠，需调整航线或等待空域开放",
      },
      sensorId: null,
      segment: null,
    });
    timeline.push({
      type: "rejudge",
      title: "补充材料提交",
      daysOffset: daysAgo - 2,
      detail: {
        operator: "方案经理-小赵",
        materials: ["空域协调函V2", "备选航线评估报告", "冲突规避预案"],
        remark: "已协调相邻管制区，调整航段4高度层至300m",
      },
      sensorId: sensorIds[randomInt(20, 30)] ?? null,
      segment: 3,
    });
    timeline.push({
      type: "final_review",
      title: "终审结论",
      daysOffset: daysAgo - 2.5,
      detail: {
        reviewer: "王总",
        result: "通过",
        remark: "补充材料充分，冲突规避方案可行，准予放行",
      },
      sensorId: null,
      segment: null,
    });
  } else {
    timeline.push({
      type: "final_review",
      title: "终审结论",
      daysOffset: daysAgo - 1.5,
      detail: {
        reviewer: "王总",
        result:
          status === "pass"
            ? "通过放行"
            : status === "supplement"
            ? "待补材料"
            : "异常待审",
        remark: conclusionSummary,
      },
      sensorId: sensorIds[sensorIds.length - 1],
      segment: corridor.segments - 1,
    });
  }

  const timelineNodeIds: string[] = [];
  timeline.forEach((node) => {
    const nodeId = uuid();
    timelineNodeIds.push(nodeId);
    insertNode.run(
      nodeId,
      planId,
      node.type,
      node.title,
      offsetDate(Math.floor(node.daysOffset)),
      node.sensorId,
      node.segment,
      jsonStringify(node.detail)
    );
  });

  {
    const conclusionId = uuid();
    const insertConclusion = db.prepare(`
      INSERT INTO conclusion (id, plan_id, result, created_at, action_items_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertConclusion.run(
      conclusionId,
      planId,
      status === "withdrawn" ? "pass" : status,
      offsetDate(daysAgo - 2),
      jsonStringify([])
    );

    const insertBasis = db.prepare(`
      INSERT INTO conclusion_basis (id, conclusion_id, sensor_record_id, interpretation)
      VALUES (?, ?, ?, ?)
    `);
    for (let i = 0; i < 3; i++) {
      const sensorId = sensorIds[randomInt(0, sensorIds.length - 1)];
      const sensorRec = db
        .prepare("SELECT * FROM sensor_record WHERE id = ?")
        .get(sensorId) as {
        id: string;
        device_code: string;
        type: string;
        raw_reading: number;
        unit: string;
        timestamp: string;
      };
      if (sensorRec) {
        insertBasis.run(
          uuid(),
          conclusionId,
          sensorId,
          `该${SENSOR_TYPES.find((s) => s.type === sensorRec.type)?.name}读数${sensorRec.raw_reading}${sensorRec.unit}在正常区间内，支持判定结论`
        );
      }
    }

    const insertAction = db.prepare(`
      INSERT INTO action_item (id, plan_id, type, description, material_ref)
      VALUES (?, ?, ?, ?, ?)
    `);

    if (status === "pass" || status === "withdrawn") {
      insertAction.run(
        uuid(),
        planId,
        "release",
        `${corridor.name} 全段可正常放行，请执行后续航线备案程序`,
        null
      );
      insertAction.run(
        uuid(),
        planId,
        "release",
        `传感器数据存档完整，可用于后续飞行前校验`,
        `SENSOR-ARCHIVE-${planId.substring(0, 8)}`
      );
    } else if (status === "supplement") {
      insertAction.run(
        uuid(),
        planId,
        "supplement",
        `请补充第${randomInt(2, 5)}航段二次雷达校验数据，对比现有高度计读数偏差`,
        `REQ-SUPP-${planId.substring(0, 8)}-01`
      );
      insertAction.run(
        uuid(),
        planId,
        "supplement",
        `请补充空域协调确认函，明确飞行时段管制要求`,
        `REQ-SUPP-${planId.substring(0, 8)}-02`
      );
      insertAction.run(
        uuid(),
        planId,
        "release",
        `其余航段数据完整，可先行备案`,
        null
      );
    } else if (status === "exception") {
      insertAction.run(
        uuid(),
        planId,
        "supplement",
        `请立即复核第3航段障碍物雷达异常读数，建议派遣无人机现场勘查`,
        `REQ-EXC-${planId.substring(0, 8)}-01`
      );
      insertAction.run(
        uuid(),
        planId,
        "supplement",
        `请提交异常排查报告，说明是否为临时障碍物或传感器故障`,
        `REQ-EXC-${planId.substring(0, 8)}-02`
      );
    }

    if (status === "withdrawn") {
      const withdrawalNodeId = timelineNodeIds[3];
      const insertWithdrawal = db.prepare(`
        INSERT INTO withdrawal_link (id, plan_id, withdrawal_record_id, withdrawal_reason, supplemented_material_ids_json, final_conclusion_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertWithdrawal.run(
        uuid(),
        planId,
        withdrawalNodeId,
        "空域协调出现冲突，与相邻管制区临时活动重叠",
        jsonStringify(["MTR-001", "MTR-002", "MTR-003"]),
        conclusionId
      );
    }
  }

  console.log(`[SEED] Created plan: ${corridor.code} -> ${status}`);
  return planId;
}

export function seedData() {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM plan").get() as {
    cnt: number;
  };
  if (count.cnt > 0) {
    console.log(`[SEED] Data already exists (${count.cnt} plans), skipping seed`);
    return;
  }

  const tx = db.transaction(() => {
    CORRIDORS.forEach((corridor, index) => {
      insertPlan(corridor, index);
    });
  });
  tx();
  console.log("[SEED] Demo data seeding completed");
}
