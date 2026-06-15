import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, initDB } from './lib/db';
import type {
  Location,
  MaterialType,
  ItemStatus,
  Judgement,
  JudgementSuggestion
} from '../shared/types';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

interface LocationSeedSpec {
  canonicalName: string;
  aliases: string[];
  lng: number;
  lat: number;
  boundaryLng: number;
  boundaryLat: number;
  hasVerbalNote: boolean;
  hasCaliberChange: boolean;
}

function buildRectangleBoundary(
  centerLng: number,
  centerLat: number,
  deltaLng: number,
  deltaLat: number
): any {
  const sw = [centerLng - deltaLng, centerLat - deltaLat];
  const se = [centerLng + deltaLng, centerLat - deltaLat];
  const ne = [centerLng + deltaLng, centerLat + deltaLat];
  const nw = [centerLng - deltaLng, centerLat + deltaLat];
  const ring = [sw, se, ne, nw, sw];
  return {
    type: 'Polygon',
    coordinates: [ring]
  };
}

const LOCATION_SPECS: LocationSeedSpec[] = [
  {
    canonicalName: '王府井小吃街北段',
    aliases: ['王府井北夜市', '王府井小吃一条街', '王府井外摆北区'],
    lng: 116.404,
    lat: 39.915,
    boundaryLng: 116.410,
    boundaryLat: 39.916,
    hasVerbalNote: true,
    hasCaliberChange: true
  },
  {
    canonicalName: '簋街东端外摆区',
    aliases: ['簋街东口夜市', '东直门内大街东端', '簋街美食城外摆'],
    lng: 116.430,
    lat: 39.945,
    boundaryLng: 116.430,
    boundaryLat: 39.945,
    hasVerbalNote: true,
    hasCaliberChange: false
  },
  {
    canonicalName: '南锣鼓巷南口',
    aliases: ['南锣南口', '南锣鼓巷地铁站外', '南锣美食街南口'],
    lng: 116.4042,
    lat: 39.9152,
    boundaryLng: 116.4042,
    boundaryLat: 39.9152,
    hasVerbalNote: true,
    hasCaliberChange: false
  },
  {
    canonicalName: '后海烟袋斜街',
    aliases: ['烟袋斜街美食', '后海前门街', '什刹海烟袋斜街'],
    lng: 116.386,
    lat: 39.940,
    boundaryLng: 116.386,
    boundaryLat: 39.940,
    hasVerbalNote: true,
    hasCaliberChange: false
  },
  {
    canonicalName: '三里屯太古里北区西广场',
    aliases: ['三里屯北区外摆', '太古里北区西广场', '三里屯酒吧街北口'],
    lng: 116.455,
    lat: 39.938,
    boundaryLng: 116.455,
    boundaryLat: 39.938,
    hasVerbalNote: true,
    hasCaliberChange: true
  },
  {
    canonicalName: '五道营胡同东段',
    aliases: ['五道营东口', '五道营胡同夜市', '安定门五道营'],
    lng: 116.417,
    lat: 39.946,
    boundaryLng: 116.417,
    boundaryLat: 39.946,
    hasVerbalNote: true,
    hasCaliberChange: false
  },
  {
    canonicalName: '国子监街西口',
    aliases: ['国子监街口', '雍和宫国子监街', '孔庙西侧街口'],
    lng: 116.412,
    lat: 39.948,
    boundaryLng: 116.412,
    boundaryLat: 39.948,
    hasVerbalNote: false,
    hasCaliberChange: false
  },
  {
    canonicalName: '前门大栅栏步行街中段',
    aliases: ['大栅栏中段', '前门步行街美食街', '大栅栏小吃一条街'],
    lng: 116.397,
    lat: 39.898,
    boundaryLng: 116.375,
    boundaryLat: 39.913,
    hasVerbalNote: true,
    hasCaliberChange: false
  },
  {
    canonicalName: '西单北大街东侧外摆',
    aliases: ['西单北大街外摆', '西单商场东侧夜市', '西单大悦城对面外摆'],
    lng: 116.375,
    lat: 39.913,
    boundaryLng: 116.373,
    boundaryLat: 39.911,
    hasVerbalNote: true,
    hasCaliberChange: false
  },
  {
    canonicalName: '国贸CBD光华路SOHO广场',
    aliases: ['光华路SOHO外摆', '国贸CBD美食广场', '国贸三期东侧外摆'],
    lng: 116.457,
    lat: 39.914,
    boundaryLng: 116.457,
    boundaryLat: 39.914,
    hasVerbalNote: false,
    hasCaliberChange: false
  },
  {
    canonicalName: '望京SOHO T1前广场',
    aliases: ['望京SOHO外摆', '望京T1美食广场', '望京街SOHO夜市'],
    lng: 116.472,
    lat: 39.997,
    boundaryLng: 116.472,
    boundaryLat: 39.997,
    hasVerbalNote: true,
    hasCaliberChange: true
  },
  {
    canonicalName: '798艺术区七星中街',
    aliases: ['798七星街', '798艺术区美食街', '酒仙桥798中街'],
    lng: 116.496,
    lat: 39.984,
    boundaryLng: 116.496,
    boundaryLat: 39.984,
    hasVerbalNote: false,
    hasCaliberChange: false
  },
  {
    canonicalName: '蓝色港湾湖畔餐饮区',
    aliases: ['蓝色港湾美食街', '朝阳公园蓝色港湾', 'SOLANA湖畔外摆'],
    lng: 116.480,
    lat: 39.947,
    boundaryLng: 116.480,
    boundaryLat: 39.947,
    hasVerbalNote: true,
    hasCaliberChange: false
  },
  {
    canonicalName: '世贸天阶北街外摆',
    aliases: ['世贸天阶夜市', '光华路世贸天阶', '世贸天阶北侧外摆'],
    lng: 116.445,
    lat: 39.915,
    boundaryLng: 116.445,
    boundaryLat: 39.915,
    hasVerbalNote: false,
    hasCaliberChange: false
  },
  {
    canonicalName: '五道口宇宙中心广场',
    aliases: ['五道口外摆', '宇宙中心美食街', '清华东门五道口夜市'],
    lng: 116.339,
    lat: 39.992,
    boundaryLng: 116.339,
    boundaryLat: 39.992,
    hasVerbalNote: true,
    hasCaliberChange: false
  }
];

interface MaterialSeedSpec {
  locationSpecIndex: number;
  type: MaterialType;
  version: number;
  isV2: boolean;
}

function buildMaterialSeedSpecs(): MaterialSeedSpec[] {
  const specs: MaterialSeedSpec[] = [];
  for (let i = 0; i < LOCATION_SPECS.length; i++) {
    specs.push({ locationSpecIndex: i, type: 'photo', version: 1, isV2: false });
    specs.push({ locationSpecIndex: i, type: 'boundary', version: 1, isV2: false });
    if (LOCATION_SPECS[i].hasVerbalNote) {
      specs.push({ locationSpecIndex: i, type: 'verbal_note', version: 1, isV2: false });
    }
    if (LOCATION_SPECS[i].hasCaliberChange) {
      specs.push({ locationSpecIndex: i, type: 'photo', version: 2, isV2: true });
    }
  }
  return specs;
}

const CALIBER_CHANGE_NOTES: Record<number, string> = {
  0: '摊位范围向东扩展2米，新增3个摊位位置',
  4: '经营时间延长至凌晨2点，摊位布局重新调整',
  10: '外摆区域南侧新增临时摊位带，面积增加约15平米'
};

const STATUS_PLAN: Array<{ locationIdx: number; status: ItemStatus }> = [
  { locationIdx: 0, status: 'pending_review' },
  { locationIdx: 1, status: 'community_verified' },
  { locationIdx: 2, status: 'pending_review' },
  { locationIdx: 3, status: 'approved' },
  { locationIdx: 4, status: 'pending_review' },
  { locationIdx: 5, status: 'community_verified' },
  { locationIdx: 6, status: 'need_supplement' },
  { locationIdx: 7, status: 'pending_review' },
  { locationIdx: 8, status: 'pending_manual' },
  { locationIdx: 9, status: 'need_supplement' },
  { locationIdx: 10, status: 'approved' },
  { locationIdx: 11, status: 'need_supplement' },
  { locationIdx: 12, status: 'community_verified' },
  { locationIdx: 13, status: 'need_supplement' },
  { locationIdx: 14, status: 'pending_review' }
];

function pickSuggestion(status: ItemStatus): JudgementSuggestion {
  switch (status) {
    case 'approved':
      return 'approve';
    case 'need_supplement':
      return 'need_supplement';
    case 'pending_manual':
      return 'pending_manual';
    default:
      return 'approve';
  }
}

export function seed(): void {
  ensureDataDir();
  initDB();

  const existingCount = (db.prepare('SELECT COUNT(*) as cnt FROM location').get() as any)
    .cnt as number;
  if (existingCount > 0) {
    return;
  }

  const now = new Date().toISOString();
  const DELTA_DEG = 0.0004;

  const insertLocation = db.prepare(`
    INSERT INTO location (id, canonical_name, aliases, lng, lat, boundary_geojson, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMaterial = db.prepare(`
    INSERT INTO material (
      id, location_id, type, version, previous_version_id, payload,
      has_caliber_change, change_note, captured_at, submitted_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO notice_item (
      id, location_id, status, current_remark, remark_history,
      auto_judgement, manual_judgement, api_response, material_ids,
      is_community_verified, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFeedback = db.prepare(`
    INSERT INTO community_feedback (id, item_id, original_text, merged_text, submitted_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const locationIds: string[] = [];
  const locationIdsBySpecIdx: Record<number, string> = {};

  const txLocations = db.transaction(() => {
    for (let i = 0; i < LOCATION_SPECS.length; i++) {
      const spec = LOCATION_SPECS[i];
      const id = crypto.randomUUID();
      const boundary = buildRectangleBoundary(
        spec.boundaryLng,
        spec.boundaryLat,
        DELTA_DEG,
        DELTA_DEG
      );
      insertLocation.run(
        id,
        spec.canonicalName,
        JSON.stringify(JSON.parse(JSON.stringify(spec.aliases))),
        spec.lng,
        spec.lat,
        JSON.stringify(JSON.parse(JSON.stringify(boundary))),
        now,
        now
      );
      locationIds.push(id);
      locationIdsBySpecIdx[i] = id;
    }
  });
  txLocations();

  const materialSeedSpecs = buildMaterialSeedSpecs();
  const v1PhotoMaterialIdsByLocIdx: Record<number, string> = {};
  const materialIdsByLocIdx: Record<number, string[]> = {};

  const txMaterials = db.transaction(() => {
    for (const matSpec of materialSeedSpecs) {
      const id = crypto.randomUUID();
      const locationId = locationIdsBySpecIdx[matSpec.locationSpecIndex];
      let previousVersionId: string | null = null;
      let hasCaliberChange: 0 | 1 = 0;
      let changeNote: string | null = null;
      let payload: any;

      if (matSpec.type === 'photo') {
        if (matSpec.isV2) {
          previousVersionId = v1PhotoMaterialIdsByLocIdx[matSpec.locationSpecIndex] ?? null;
          hasCaliberChange = 1;
          changeNote = CALIBER_CHANGE_NOTES[matSpec.locationSpecIndex] ?? '口径调整';
          payload = {
            url: `https://mock-photo.example.com/${locationId}/v2/${id}.jpg`,
            width: 4032,
            height: 3024,
            shotAngle: 'top-down-expanded',
            stallCount: matSpec.locationSpecIndex === 0 ? 18 : matSpec.locationSpecIndex === 4 ? 22 : 25,
            timestamp: now,
            photographer: 'city_inspector_v2'
          };
        } else {
          payload = {
            url: `https://mock-photo.example.com/${locationId}/v1/${id}.jpg`,
            width: 4032,
            height: 3024,
            shotAngle: 'top-down',
            stallCount: matSpec.locationSpecIndex === 0 ? 15 : matSpec.locationSpecIndex === 4 ? 20 : 22,
            timestamp: now,
            photographer: 'city_inspector_v1'
          };
          v1PhotoMaterialIdsByLocIdx[matSpec.locationSpecIndex] = id;
        }
      } else if (matSpec.type === 'boundary') {
        const boundary = buildRectangleBoundary(
          LOCATION_SPECS[matSpec.locationSpecIndex].boundaryLng,
          LOCATION_SPECS[matSpec.locationSpecIndex].boundaryLat,
          DELTA_DEG,
          DELTA_DEG
        );
        payload = {
          source: 'manual_digitization',
          srid: 4326,
          geometry: boundary,
          area_sqm: 6400,
          digitizedBy: 'survey_team_a'
        };
      } else if (matSpec.type === 'verbal_note') {
        const locationName = LOCATION_SPECS[matSpec.locationSpecIndex].canonicalName;
        const samples = [
          `据${locationName}管理方口述，夜市每日18点至24点经营，共约20个摊位，均为注册个体户`,
          `${locationName}周边商户反馈，该点位已运营3年，主要经营小吃和文创产品，卫生检查合格`,
          `${locationName}街道办口头确认：外摆区域仅允许在周末和法定节假日运营，工作日禁止占路`
        ];
        const idx = matSpec.locationSpecIndex % samples.length;
        payload = {
          transcript: samples[idx],
          interviewee: `${locationName.slice(0, 4)}管理处张主任`,
          recordedAt: now,
          audioUrl: `https://mock-audio.example.com/${locationId}/${id}.m4a`,
          language: 'zh-CN'
        };
      } else {
        payload = { type: matSpec.type, id };
      }

      insertMaterial.run(
        id,
        locationId,
        matSpec.type,
        matSpec.version,
        previousVersionId,
        JSON.stringify(JSON.parse(JSON.stringify(payload))),
        hasCaliberChange,
        changeNote,
        now,
        'seed_inspector',
        now
      );

      if (!materialIdsByLocIdx[matSpec.locationSpecIndex]) {
        materialIdsByLocIdx[matSpec.locationSpecIndex] = [];
      }
      materialIdsByLocIdx[matSpec.locationSpecIndex].push(id);
    }
  });
  txMaterials();

  const itemIdsByLocIdx: Record<number, string> = {};

  const txItems = db.transaction(() => {
    for (const plan of STATUS_PLAN) {
      const id = crypto.randomUUID();
      const locationId = locationIdsBySpecIdx[plan.locationIdx];
      const locSpec = LOCATION_SPECS[plan.locationIdx];
      const materialIds = materialIdsByLocIdx[plan.locationIdx] ?? [];

      const missingMaterials: MaterialType[] = [];
      if (!locSpec.hasVerbalNote) {
        missingMaterials.push('verbal_note');
      }

      const suggestion = pickSuggestion(plan.status);
      const confidence = suggestion === 'approve' ? 0.93 : suggestion === 'need_supplement' ? 0.88 : 0.71;

      const judgement: Judgement = {
        suggestion,
        confidence,
        missingMaterials,
        remark: suggestion === 'need_supplement'
          ? `缺少${missingMaterials.join('、')}，请补充后重新提交`
          : plan.status === 'pending_manual'
          ? '边界坐标存在歧义，需人工复核点位归属'
          : '信息完备，符合公告条件',
        modelVersion: 'night-market-judge-v1.2.0',
        judgedAt: now
      };

      const apiResp = {
        gateway: 'night-market-notice-gateway',
        requestId: crypto.randomUUID(),
        submittedAt: now,
        accepted: plan.status !== 'need_supplement'
      };

      const currentRemark = plan.status === 'need_supplement'
        ? '材料不完整，等待补充口头证言'
        : plan.status === 'pending_manual'
        ? '坐标存在偏移，已转交人工审核组'
        : null;

      const isCommunityVerified = plan.status === 'community_verified' ? 1 : 0;

      insertItem.run(
        id,
        locationId,
        plan.status,
        currentRemark,
        JSON.stringify([]),
        JSON.stringify(JSON.parse(JSON.stringify(judgement))),
        null,
        JSON.stringify(JSON.parse(JSON.stringify(apiResp))),
        JSON.stringify(JSON.parse(JSON.stringify(materialIds))),
        isCommunityVerified,
        now,
        now
      );

      itemIdsByLocIdx[plan.locationIdx] = id;
    }
  });
  txItems();

  const communityVerifiedIdxs = STATUS_PLAN
    .filter((p) => p.status === 'community_verified')
    .map((p) => p.locationIdx);

  const feedbackSamples: Array<{ original: string; merged: string }> = [
    {
      original: '对，簋街东口那片我们摆摊五六年了，每天晚上5点就来，一直到凌晨两三点，主要都是烤串和麻辣小龙虾，城管那边都打过招呼的，没问题。',
      merged: '簋街东端外摆区运营约6年，每日17:00至次日02:00经营，主营烤串、麻辣小龙虾等，与属地管理方存在既定协调机制。'
    },
    {
      original: '五道营这边主要是周末人多，周五周六晚上摆摊，平时工作日不让摆，我们都是卖些文创小玩意儿和手工饮品，胡同里居委会都熟。',
      merged: '五道营胡同东段外摆限周末（周五、周六）运营，主营文创产品、手工饮品，与属地社区居委会保持日常沟通。'
    },
    {
      original: '蓝色港湾湖畔那一排餐饮外摆是物业统一管的，夏天人特别多，冬天就少一些，营业时间跟商场走，一般到晚上10点半左右就收了。',
      merged: '蓝色港湾湖畔餐饮区由商场物业统一运营管理，夏季经营规模较大，冬季缩减，营业时间与商场同步约至22:30。'
    }
  ];

  const txFeedback = db.transaction(() => {
    for (let i = 0; i < communityVerifiedIdxs.length; i++) {
      const locIdx = communityVerifiedIdxs[i];
      const itemId = itemIdsByLocIdx[locIdx];
      const sample = feedbackSamples[i % feedbackSamples.length];
      const id = crypto.randomUUID();
      insertFeedback.run(
        id,
        itemId,
        sample.original,
        sample.merged,
        `community_volunteer_${i + 1}`,
        now
      );
    }
  });
  txFeedback();
}
