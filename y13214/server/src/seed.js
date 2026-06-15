import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const RECORDS_FILE = join(DATA_DIR, 'records.json');
const VERSIONS_FILE = join(DATA_DIR, 'versions.json');

function isExpired(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d < new Date();
}

function detectStatus(r) {
  if (r.manualStatus) return r.manualStatus;
  if (isExpired(r.authorizationExpiry)) return 'expired';
  if (!r.singerName || r.shareRatio == null || r.shareRatio === '' || !r.workTitle || !r.authorizationExpiry) {
    return 'pending';
  }
  return 'ready';
}

export function seedIfEmpty() {
  if (!fs.existsSync(RECORDS_FILE) || fs.readFileSync(RECORDS_FILE, 'utf8').trim() === '') {
    const now = new Date().toISOString();
    const samples = [
      {
        workTitle: '黄河大合唱·保卫黄河',
        singerName: '王明远',
        part: '男高',
        shareRatio: 25,
        authorizationExpiry: '2026-12-31',
        contactInfo: '13800001111',
        rehearsalNote: '每周三晚排练，注意第二声部进入时机',
        manualNote: '已确认比例，可放行。——小孟',
        manualStatus: 'ready',
        source: '2026-06-黄河大合唱分账.xlsx'
      },
      {
        workTitle: '黄河大合唱·保卫黄河',
        singerName: '李秀英',
        part: '女高',
        shareRatio: 25,
        authorizationExpiry: '2026-12-31',
        contactInfo: '13800002222',
        rehearsalNote: '需额外录制独唱片段',
        manualNote: '',
        source: '2026-06-黄河大合唱分账.xlsx'
      },
      {
        workTitle: '黄河大合唱·黄水谣',
        singerName: '张大伟',
        part: '男低',
        shareRatio: 30,
        authorizationExpiry: '2025-06-01',
        contactInfo: '13800003333',
        authorizationStatus: '已过期，待续约',
        rehearsalNote: '',
        manualNote: '授权已过期，暂不放行，等待续约确认。——小孟',
        source: '2026-06-黄河大合唱分账.xlsx'
      },
      {
        workTitle: '歌唱祖国',
        singerName: '',
        part: '女低',
        shareRatio: '',
        authorizationExpiry: '',
        contactInfo: '',
        rehearsalNote: '',
        manualNote: '',
        source: '旧版数据_歌唱祖国.csv'
      },
      {
        workTitle: '我和我的祖国',
        singerName: '陈雅琴',
        part: '女高',
        shareRatio: 40,
        authorizationExpiry: '2027-03-15',
        contactInfo: 'chen@example.com',
        rehearsalNote: '与男高声部配合需再练两次',
        manualNote: '比例已和陈老师确认。——小孟',
        manualStatus: 'ready',
        source: '我和我的祖国_声部分账v2.xlsx'
      },
      {
        workTitle: '我和我的祖国',
        singerName: '刘志强',
        part: '男高',
        shareRatio: 35,
        authorizationExpiry: '2027-03-15',
        contactInfo: '',
        rehearsalNote: '',
        manualNote: '',
        source: '我和我的祖国_声部分账v2.xlsx'
      },
      {
        workTitle: '在希望的田野上',
        singerName: '赵丽娟',
        part: '女高',
        shareRatio: 30,
        authorizationExpiry: '2026-08-20',
        contactInfo: '13911112222',
        rehearsalNote: '',
        manualNote: '',
        source: '田野上_最新确认版.xlsx'
      },
      {
        workTitle: '在希望的田野上',
        singerName: '孙建国',
        part: '男低',
        shareRatio: 20,
        authorizationExpiry: '2024-12-01',
        contactInfo: '',
        authorizationStatus: '合作已终止',
        rehearsalNote: '',
        manualNote: '孙老师已不再参与，需替换声部。——小孟',
        source: '田野上_最新确认版.xlsx'
      },
      {
        workTitle: '让我们荡起双桨',
        singerName: '周小雨',
        part: '女高',
        shareRatio: 50,
        authorizationExpiry: '2026-10-01',
        contactInfo: '',
        rehearsalNote: '',
        manualNote: '',
        source: '少儿合唱团曲目v3.xlsx'
      },
      {
        workTitle: '让我们荡起双桨',
        singerName: '',
        part: '',
        shareRatio: '',
        authorizationExpiry: '',
        contactInfo: '',
        rehearsalNote: '',
        manualNote: '',
        source: '少儿合唱团曲目v3.xlsx'
      }
    ];

    const records = samples.map((s) => {
      const raw = { ...s };
      delete raw.manualStatus;
      delete raw.manualNote;
      delete raw.source;
      const rec = {
        id: uuidv4(),
        raw,
        source: s.source,
        importedAt: now,
        manualStatus: s.manualStatus || null,
        manualNote: s.manualNote || '',
        screenshot: '',
        deliveryChecklist: [],
        workTitle: s.workTitle || '',
        singerName: s.singerName || '',
        part: s.part || '',
        shareRatio: s.shareRatio != null ? s.shareRatio : '',
        authorizationExpiry: s.authorizationExpiry || '',
        authorizationStatus: s.authorizationStatus || '',
        contactInfo: s.contactInfo || '',
        rehearsalNote: s.rehearsalNote || '',
        isExpired: isExpired(s.authorizationExpiry),
        status: null
      };
      rec.status = detectStatus(rec);
      return rec;
    });

    fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), 'utf8');

    const initialVersion = [
      {
        id: uuidv4(),
        label: '初始示例数据',
        operator: '系统',
        createdAt: now,
        recordCount: records.length,
        records: JSON.parse(JSON.stringify(records))
      }
    ];
    fs.writeFileSync(VERSIONS_FILE, JSON.stringify(initialVersion, null, 2), 'utf8');

    console.log('[seed] 已生成示例数据，共', records.length, '条记录');
  }
}
