import { randomUUID } from 'crypto';
import db, { initDb, resetDb, isEmpty } from './db.js';
import {
  insertItem,
  updateRampStatus,
} from './repositories/rampRepo.js';
import { insertChangeLog, insertFeedback } from './repositories/auditRepo.js';
import type { RampStatus, Source } from '../shared/types.js';

interface SeedRamp {
  id: string;
  name: string;
  bridge: string;
  address: string;
  lat: number;
  lng: number;
  status: RampStatus;
  overriding: boolean;
  items: {
    title: string;
    source: Source;
    content: string;
    photoUrl?: string;
    isOverriding?: boolean;
    daysAgo: number;
  }[];
  logs: {
    source: Source;
    previous: RampStatus | null;
    next: RampStatus;
    note: string;
    affected: string;
    operator: string;
    daysAgo: number;
  }[];
}

const BASE = new Date('2026-06-17T09:00:00+08:00');
function ts(daysAgo: number, hour = 9): string {
  const d = new Date(BASE);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const RAMPS: SeedRamp[] = [
  {
    id: 'r1',
    name: '滨河南路慢行桥·东坡道',
    bridge: '滨河南路慢行桥',
    address: '滨河南路 118 号',
    lat: 31.2308,
    lng: 121.4752,
    status: 'processed',
    overriding: false,
    items: [{ title: '坡道竣工材料', source: 'normal', content: '竣工验收材料齐全', daysAgo: 20 }],
    logs: [
      {
        source: 'normal',
        previous: null,
        next: 'processed',
        note: '初始材料审核通过',
        affected: '判定为已处理',
        operator: '社区运营',
        daysAgo: 20,
      },
    ],
  },
  {
    id: 'r2',
    name: '滨河南路慢行桥·西坡道',
    bridge: '滨河南路慢行桥',
    address: '滨河南路 122 号',
    lat: 31.2303,
    lng: 121.4746,
    status: 'overridden',
    overriding: false,
    items: [],
    logs: [
      {
        source: 'resident_feedback',
        previous: 'processed',
        next: 'pending',
        note: '居民反映坡道夜间无照明，存在安全隐患',
        affected: '由「已处理」改为「待补材料」，需补充照明材料',
        operator: '社区运营',
        daysAgo: 12,
      },
      {
        source: 'manual_override',
        previous: 'pending',
        next: 'overridden',
        note: '负责人核定为人工改判，先挂账待整改',
        affected: '由「待补材料」改为「人工改判」',
        operator: '负责人',
        daysAgo: 3,
      },
    ],
  },
  {
    id: 'r3',
    name: '人民公园慢行桥·南坡道',
    bridge: '人民公园慢行桥',
    address: '公园路 56 号',
    lat: 31.2321,
    lng: 121.4682,
    status: 'pending',
    overriding: true,
    items: [
      {
        title: '旧方案设计图（覆盖新意见）',
        source: 'old_plan_override',
        content: '旧方案未纳入居民提出的无障碍坡比新意见',
        isOverriding: true,
        daysAgo: 14,
      },
      {
        title: '现场照片：坡道西侧破损',
        source: 'on_site_photo',
        content: '补录现场照片，西侧坡面存在破损',
        photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=close%20up%20photo%20of%20a%20cracked%20pedestrian%20bridge%20ramp%20surface%20with%20concrete%20damage&image_size=landscape_4_3',
        daysAgo: 5,
      },
    ],
    logs: [
      {
        source: 'old_plan_override',
        previous: null,
        next: 'pending',
        note: '旧方案覆盖新意见，无障碍坡比未按新意见调整',
        affected: '旧方案覆盖新意见，坡道待补材料',
        operator: '社区运营',
        daysAgo: 14,
      },
      {
        source: 'on_site_photo',
        previous: 'pending',
        next: 'pending',
        note: '现场照片补录：西侧坡面破损',
        affected: '照片补录确认坡面破损，维持「待补材料」并增补修复项',
        operator: '社区运营',
        daysAgo: 5,
      },
    ],
  },
  {
    id: 'r4',
    name: '人民公园慢行桥·北坡道',
    bridge: '人民公园慢行桥',
    address: '公园路 60 号',
    lat: 31.2326,
    lng: 121.4677,
    status: 'processed',
    overriding: false,
    items: [
      { title: '竣工材料', source: 'normal', content: '材料齐全', daysAgo: 18 },
      {
        title: '现场照片：完工验收',
        source: 'on_site_photo',
        content: '补录现场完工照片',
        photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=finished%20pedestrian%20bridge%20ramp%20with%20handrails%20on%20a%20sunny%20day&image_size=landscape_4_3',
        daysAgo: 4,
      },
    ],
    logs: [
      { source: 'normal', previous: null, next: 'processed', note: '初始审核通过', affected: '判定为已处理', operator: '社区运营', daysAgo: 18 },
      { source: 'on_site_photo', previous: 'processed', next: 'processed', note: '现场照片补录：完工验收', affected: '照片补录佐证完工，维持「已处理」', operator: '社区运营', daysAgo: 4 },
    ],
  },
  {
    id: 'r5',
    name: '滨江北路人行天桥·东坡道',
    bridge: '滨江北路人行天桥',
    address: '滨江北段 8 号',
    lat: 31.2352,
    lng: 121.4793,
    status: 'overridden',
    overriding: false,
    items: [],
    logs: [
      {
        source: 'manual_override',
        previous: 'pending',
        next: 'overridden',
        note: '坡道坡度超标，人工改判挂账整改',
        affected: '由「待补材料」改为「人工改判」',
        operator: '负责人',
        daysAgo: 2,
      },
    ],
  },
  {
    id: 'r6',
    name: '滨江北路人行天桥·西坡道',
    bridge: '滨江北路人行天桥',
    address: '滨江北段 12 号',
    lat: 31.2348,
    lng: 121.4786,
    status: 'pending',
    overriding: true,
    items: [
      {
        title: '旧方案图纸（覆盖新意见）',
        source: 'old_plan_override',
        content: '旧方案栏杆高度未按新规范新意见执行',
        isOverriding: true,
        daysAgo: 10,
      },
    ],
    logs: [
      {
        source: 'old_plan_override',
        previous: null,
        next: 'pending',
        note: '旧方案覆盖新意见，栏杆高度需复核',
        affected: '旧方案覆盖新意见，待补材料',
        operator: '社区运营',
        daysAgo: 10,
      },
    ],
  },
  {
    id: 'r7',
    name: '学院路跨河慢行桥·主坡道',
    bridge: '学院路跨河慢行桥',
    address: '学院路 200 号',
    lat: 31.2282,
    lng: 121.4723,
    status: 'processed',
    overriding: false,
    items: [{ title: '竣工材料', source: 'normal', content: '材料齐全', daysAgo: 22 }],
    logs: [
      { source: 'normal', previous: null, next: 'processed', note: '初始审核通过', affected: '判定为已处理', operator: '社区运营', daysAgo: 22 },
    ],
  },
  {
    id: 'r8',
    name: '文体中心慢行桥·北坡道',
    bridge: '文体中心慢行桥',
    address: '文体路 9 号',
    lat: 31.2336,
    lng: 121.4766,
    status: 'pending',
    overriding: false,
    items: [
      {
        title: '现场照片：坡道积水',
        source: 'on_site_photo',
        content: '补录现场照片，坡道末端积水',
        photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pedestrian%20bridge%20ramp%20with%20standing%20water%20puddle%20at%20the%20bottom&image_size=landscape_4_3',
        daysAgo: 6,
      },
    ],
    logs: [
      {
        source: 'resident_feedback',
        previous: 'processed',
        next: 'pending',
        note: '居民反馈坡道末端雨天积水（灰度备注）',
        affected: '由「已处理」改为「待补材料」，需补排水方案',
        operator: '社区运营',
        daysAgo: 6,
      },
      {
        source: 'on_site_photo',
        previous: 'pending',
        next: 'pending',
        note: '现场照片补录：坡道积水',
        affected: '照片补录确认积水，维持「待补材料」',
        operator: '社区运营',
        daysAgo: 6,
      },
    ],
  },
];

function insertSeedData(): void {
  const insertRamp = db.prepare(
    `INSERT INTO ramps (id, name, bridge_name, address, lat, lng, current_status, is_overriding, created_at, updated_at)
     VALUES (@id, @name, @bridge, @address, @lat, @lng, @status, @overriding, @created, @updated)`,
  );
  const tx = db.transaction(() => {
    for (const r of RAMPS) {
      const created = ts(22);
      insertRamp.run({
        id: r.id,
        name: r.name,
        bridge: r.bridge,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        status: r.status,
        overriding: r.overriding ? 1 : 0,
        created,
        updated: ts(Math.min(...r.logs.map((l) => l.daysAgo))),
      });
      for (const it of r.items) {
        insertItem({
          id: randomUUID(),
          rampId: r.id,
          title: it.title,
          source: it.source,
          content: it.content,
          photoUrl: it.photoUrl ?? null,
          isOverriding: Boolean(it.isOverriding),
          submittedAt: ts(it.daysAgo),
        });
      }
      const sortedLogs = [...r.logs].sort((a, b) => b.daysAgo - a.daysAgo); // 最早在前
      let prev: RampStatus | null = null;
      for (const lg of sortedLogs) {
        const itemId = lg.source === 'on_site_photo'
          ? (db.prepare('SELECT id FROM items WHERE ramp_id = ? AND source = ? ORDER BY submitted_at DESC LIMIT 1').get(r.id, lg.source) as { id: string } | undefined)?.id ?? null
          : null;
        insertChangeLog({
          id: randomUUID(),
          rampId: r.id,
          itemId,
          source: lg.source,
          previousStatus: lg.previous ?? prev,
          newStatus: lg.next,
          note: lg.note,
          affectedSummary: lg.affected,
          operator: lg.operator,
          createdAt: ts(lg.daysAgo, 9 + lg.daysAgo),
        });
        prev = lg.next;
      }
      // 灰度居民反馈备注（r8）
      if (r.id === 'r8') {
        insertFeedback({
          id: randomUUID(),
          content: '居民反馈：坡道末端雨天积水，建议补排水方案（灰度发布前临时补录）',
          isGrayscale: true,
          affectsRamps: ['r8'],
          createdAt: ts(6, 8),
        });
      }
      // 确保状态与覆盖标记与改判记录一致
      updateRampStatus(r.id, r.status, r.overriding);
    }
  });
  tx();
}

export function seedSampleData(opts: { reset?: boolean } = {}): void {
  initDb();
  if (opts.reset) resetDb();
  insertSeedData();
}

export function seedIfEmpty(): boolean {
  if (!isEmpty()) return false;
  insertSeedData();
  return true;
}

// 直接执行：npm run seed
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSampleData({ reset: true });
  const counts = db
    .prepare('SELECT current_status AS s, COUNT(*) AS c FROM ramps GROUP BY current_status')
    .all() as { s: string; c: number }[];
  console.log('示例数据已写入（已重置）：', counts);
}
