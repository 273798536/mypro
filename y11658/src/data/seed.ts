import type { Coil, Spreader, Rail, Zone, Task, AuditEntry } from "@/types";
import { makeAuditId, nowISO } from "@/utils/storage";

function seedAudit(source = "seed"): AuditEntry[] {
  return [
    {
      id: makeAuditId(),
      time: nowISO(),
      source,
      strategy: "overwrite",
      operator: "system",
    },
  ];
}

export const SEED_COILS: Coil[] = [
  {
    id: "COIL_A1",
    name: "冷轧卷 A1",
    weight: 18,
    length: 2.2,
    diameter: 1.2,
    cog: { x: 0.05, y: 0.02 },
    audit: seedAudit(),
  },
  {
    id: "COIL_B2",
    name: "热轧卷 B2",
    weight: 24,
    length: 2.6,
    diameter: 1.4,
    cog: { x: 0.08, y: -0.03 },
    audit: seedAudit(),
  },
];

export const SEED_SPREADERS: Spreader[] = [
  {
    id: "SP_10T",
    name: "10t 电磁吊具",
    capacity: 10,
    offsetLimit: 0.08,
    audit: seedAudit(),
  },
  {
    id: "SP_25T",
    name: "25t 夹钳吊具",
    capacity: 25,
    offsetLimit: 0.15,
    audit: seedAudit(),
  },
];

export const SEED_RAILS: Rail[] = [
  {
    id: "RAIL_MAIN",
    name: "主跨轨道",
    capacity: 30,
    points: [
      { x: -6, y: 0, z: 0 },
      { x: -3, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
      { x: 6, y: 0, z: 0 },
    ],
    audit: seedAudit(),
  },
];

export const SEED_ZONES: Zone[] = [
  {
    id: "ZONE_SAFE",
    name: "安全作业区",
    type: "safe",
    polygon: [
      { x: -8, z: -4 },
      { x: 8, z: -4 },
      { x: 8, z: -2 },
      { x: -8, z: -2 },
    ],
    audit: seedAudit(),
  },
  {
    id: "ZONE_RESTRICTED",
    name: "人员通道",
    type: "restricted",
    polygon: [
      { x: -2, z: 1 },
      { x: 2, z: 1 },
      { x: 2, z: 3 },
      { x: -2, z: 3 },
    ],
    audit: seedAudit(),
  },
  {
    id: "ZONE_DANGER",
    name: "高压区",
    type: "danger",
    polygon: [
      { x: 4, z: 2 },
      { x: 7, z: 2 },
      { x: 7, z: 5 },
      { x: 4, z: 5 },
    ],
    audit: seedAudit(),
  },
];

export const SEED_TASKS: Task[] = [
  {
    id: "TASK_01",
    name: "冷卷 A1 转场",
    coilId: "COIL_A1",
    spreaderId: "SP_25T",
    railId: "RAIL_MAIN",
    zones: ["ZONE_SAFE", "ZONE_RESTRICTED", "ZONE_DANGER"],
    start: { x: -5, y: 2, z: -3 },
    end: { x: 5, y: 2, z: -3 },
    audit: seedAudit(),
  },
];
