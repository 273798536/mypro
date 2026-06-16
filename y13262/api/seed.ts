import { v4 as uuidv4 } from 'uuid'
import db from './db.js'

export function seed(): void {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM complaints').get() as { cnt: number }
  if (count.cnt > 0) return

  const insertComplaint = db.prepare(`
    INSERT INTO complaints (id, original_text, location_raw, location_normalized, status, source, reported_at, note, merge_group_id, created_at, updated_at)
    VALUES (@id, @original_text, @location_raw, @location_normalized, @status, @source, @reported_at, @note, @merge_group_id, @created_at, @updated_at)
  `)

  const insertPhoto = db.prepare(`
    INSERT INTO photos (id, complaint_id, url, original_name, is_available)
    VALUES (@id, @complaint_id, @url, @original_name, @is_available)
  `)

  const insertMergeRecord = db.prepare(`
    INSERT INTO merge_records (id, group_id, merged_location, merge_basis, confirmed_by, confirmed_at, created_at)
    VALUES (@id, @group_id, @merged_location, @merge_basis, @confirmed_by, @confirmed_at, @created_at)
  `)

  const insertMergeRecordComplaint = db.prepare(`
    INSERT INTO merge_record_complaints (merge_record_id, complaint_id, original_location)
    VALUES (@merge_record_id, @complaint_id, @original_location)
  `)

  const insertNoteHistory = db.prepare(`
    INSERT INTO note_histories (id, complaint_id, field, old_value, new_value, changed_by, changed_at)
    VALUES (@id, @complaint_id, @field, @old_value, @new_value, @changed_by, @changed_at)
  `)

  const insertConfirmationLog = db.prepare(`
    INSERT INTO confirmation_logs (id, merge_group_id, action, before_snapshot, after_snapshot, operator, operated_at)
    VALUES (@id, @merge_group_id, @action, @before_snapshot, @after_snapshot, @operator, @operated_at)
  `)

  const now = new Date().toISOString()
  const groupId1 = uuidv4()
  const groupId2 = uuidv4()
  const mergeRecordId1 = uuidv4()
  const mergeRecordId2 = uuidv4()

  const complaints = [
    {
      id: uuidv4(), original_text: '人民路10号雨水口严重积淤，下雨天水都漫到路面了', location_raw: '人民路10号',
      location_normalized: '人民路10号', status: 'merged', source: '12345热线',
      reported_at: '2025-05-01T08:30:00Z', note: '已安排清淤', merge_group_id: groupId1,
      created_at: '2025-05-01T08:30:00Z', updated_at: '2025-05-02T10:00:00Z'
    },
    {
      id: uuidv4(), original_text: '人民路十号附近雨水口堵了，树叶和泥沙都淤积在里面', location_raw: '人民路十号附近',
      location_normalized: '人民路10号', status: 'merged', source: '市民通APP',
      reported_at: '2025-05-01T09:15:00Z', note: '已安排清淤', merge_group_id: groupId1,
      created_at: '2025-05-01T09:15:00Z', updated_at: '2025-05-02T10:00:00Z'
    },
    {
      id: uuidv4(), original_text: '人民路10号(东侧)雨水口积淤，影响排水', location_raw: '人民路10号(东侧)',
      location_normalized: '人民路10号', status: 'merged', source: '巡检上报',
      reported_at: '2025-05-01T14:20:00Z', note: '已安排清淤', merge_group_id: groupId1,
      created_at: '2025-05-01T14:20:00Z', updated_at: '2025-05-02T10:00:00Z'
    },
    {
      id: uuidv4(), original_text: '人民路20号门口雨水口积淤，污水外溢', location_raw: '人民路20号',
      location_normalized: '人民路20号', status: 'pending', source: '微信公众号',
      reported_at: '2025-05-03T07:45:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-03T07:45:00Z', updated_at: '2025-05-03T07:45:00Z'
    },
    {
      id: uuidv4(), original_text: '中山路55号雨水口积淤严重，积水深约20cm', location_raw: '中山路55号',
      location_normalized: '中山路55号', status: 'merged', source: '12345热线',
      reported_at: '2025-05-04T10:00:00Z', note: '需协调市政处理', merge_group_id: groupId2,
      created_at: '2025-05-04T10:00:00Z', updated_at: '2025-05-05T09:00:00Z'
    },
    {
      id: uuidv4(), original_text: '中山路55号门口雨水箅子堵塞', location_raw: '中山路55号门口',
      location_normalized: '中山路55号', status: 'merged', source: '市民通APP',
      reported_at: '2025-05-04T11:30:00Z', note: '需协调市政处理', merge_group_id: groupId2,
      created_at: '2025-05-04T11:30:00Z', updated_at: '2025-05-05T09:00:00Z'
    },
    {
      id: uuidv4(), original_text: '解放路100号雨水口积淤，排水不畅', location_raw: '解放路100号',
      location_normalized: '解放路100号', status: 'pending', source: '巡检上报',
      reported_at: '2025-05-06T08:00:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-06T08:00:00Z', updated_at: '2025-05-06T08:00:00Z'
    },
    {
      id: uuidv4(), original_text: '建设路8号旁雨水口堵塞，生活垃圾堵塞', location_raw: '建设路8号旁',
      location_normalized: '建设路8号', status: 'pending', source: '12345热线',
      reported_at: '2025-05-07T13:20:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-07T13:20:00Z', updated_at: '2025-05-07T13:20:00Z'
    },
    {
      id: uuidv4(), original_text: '和平路33号雨水口积淤，雨天严重积水', location_raw: '和平路33号',
      location_normalized: '和平路33号', status: 'pending', source: '微信公众号',
      reported_at: '2025-05-08T09:10:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-08T09:10:00Z', updated_at: '2025-05-08T09:10:00Z'
    },
    {
      id: uuidv4(), original_text: '人民路20号对面雨水口积淤，泥沙堵塞严重', location_raw: '人民路20号对面',
      location_normalized: '人民路20号', status: 'pending', source: '市民通APP',
      reported_at: '2025-05-09T16:30:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-09T16:30:00Z', updated_at: '2025-05-09T16:30:00Z'
    },
    {
      id: uuidv4(), original_text: '光明路12号雨水口积淤，行人出行受阻', location_raw: '光明路12号',
      location_normalized: '光明路12号', status: 'pending', source: '12345热线',
      reported_at: '2025-05-10T11:00:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-10T11:00:00Z', updated_at: '2025-05-10T11:00:00Z'
    },
    {
      id: uuidv4(), original_text: '长江路78号雨水口积淤，树叶和泥沙淤积', location_raw: '长江路78号',
      location_normalized: '长江路78号', status: 'pending', source: '巡检上报',
      reported_at: '2025-05-11T07:50:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-11T07:50:00Z', updated_at: '2025-05-11T07:50:00Z'
    },
    {
      id: uuidv4(), original_text: '黄河路200号雨水口堵塞，大量泥沙堆积', location_raw: '黄河路200号',
      location_normalized: '黄河路200号', status: 'confirmed', source: '12345热线',
      reported_at: '2025-04-20T14:00:00Z', note: '已确认并安排清淤队伍', merge_group_id: null,
      created_at: '2025-04-20T14:00:00Z', updated_at: '2025-04-22T09:00:00Z'
    },
    {
      id: uuidv4(), original_text: '文化路15号雨水口积淤，暴雨后积水严重', location_raw: '文化路15号',
      location_normalized: '文化路15号', status: 'pending', source: '微信公众号',
      reported_at: '2025-05-12T08:30:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-12T08:30:00Z', updated_at: '2025-05-12T08:30:00Z'
    },
    {
      id: uuidv4(), original_text: '学府路66号雨水口积淤，学生上下学通行困难', location_raw: '学府路66号',
      location_normalized: '学府路66号', status: 'pending', source: '市民通APP',
      reported_at: '2025-05-13T07:15:00Z', note: '', merge_group_id: null,
      created_at: '2025-05-13T07:15:00Z', updated_at: '2025-05-13T07:15:00Z'
    },
  ]

  const complaintIds = complaints.map(c => c.id)

  const photos: Array<{
    id: string; complaint_id: string; url: string; original_name: string; is_available: number
  }> = []

  for (const c of complaints) {
    if (c.source === '12345热线' || c.source === '市民通APP' || c.source === '巡检上报') {
      photos.push({
        id: uuidv4(), complaint_id: c.id, url: `https://example.com/photos/${c.id}_1.jpg`,
        original_name: `${c.location_raw}_现场1.jpg`, is_available: 1
      })
      photos.push({
        id: uuidv4(), complaint_id: c.id, url: `https://example.com/photos/${c.id}_2.jpg`,
        original_name: `${c.location_raw}_现场2.jpg`, is_available: 1
      })
    }
  }

  photos.push({
    id: uuidv4(), complaint_id: complaintIds[3], url: '',
    original_name: '人民路20号_照片.jpg', is_available: 0
  })
  photos.push({
    id: uuidv4(), complaint_id: complaintIds[7], url: 'https://example.com/photos/broken_link.jpg',
    original_name: '建设路8号_照片.jpg', is_available: 0
  })

  const mergeRecords = [
    {
      id: mergeRecordId1, group_id: groupId1, merged_location: '人民路10号',
      merge_basis: '同一位置不同表述，经核实为同一雨水口', confirmed_by: '张工', confirmed_at: '2025-05-03T10:00:00Z',
      created_at: '2025-05-02T10:00:00Z'
    },
    {
      id: mergeRecordId2, group_id: groupId2, merged_location: '中山路55号',
      merge_basis: '同一位置不同表述，均指向中山路55号雨水口', confirmed_by: null, confirmed_at: null,
      created_at: '2025-05-05T09:00:00Z'
    },
  ]

  const mergeRecordComplaints = [
    { merge_record_id: mergeRecordId1, complaint_id: complaintIds[0], original_location: '人民路10号' },
    { merge_record_id: mergeRecordId1, complaint_id: complaintIds[1], original_location: '人民路十号附近' },
    { merge_record_id: mergeRecordId1, complaint_id: complaintIds[2], original_location: '人民路10号(东侧)' },
    { merge_record_id: mergeRecordId2, complaint_id: complaintIds[4], original_location: '中山路55号' },
    { merge_record_id: mergeRecordId2, complaint_id: complaintIds[5], original_location: '中山路55号门口' },
  ]

  const noteHistories = [
    {
      id: uuidv4(), complaint_id: complaintIds[0], field: 'note', old_value: '', new_value: '已安排清淤',
      changed_by: '张工', changed_at: '2025-05-02T10:00:00Z'
    },
    {
      id: uuidv4(), complaint_id: complaintIds[4], field: 'note', old_value: '', new_value: '需协调市政处理',
      changed_by: '李工', changed_at: '2025-05-05T09:00:00Z'
    },
    {
      id: uuidv4(), complaint_id: complaintIds[12], field: 'note', old_value: '', new_value: '已确认并安排清淤队伍',
      changed_by: '王工', changed_at: '2025-04-22T09:00:00Z'
    },
  ]

  const confirmationLogs = [
    {
      id: uuidv4(), merge_group_id: groupId1, action: 'merge',
      before_snapshot: JSON.stringify({ complaint_ids: [complaintIds[0], complaintIds[1], complaintIds[2]], statuses: ['pending', 'pending', 'pending'] }),
      after_snapshot: JSON.stringify({ complaint_ids: [complaintIds[0], complaintIds[1], complaintIds[2]], statuses: ['merged', 'merged', 'merged'] }),
      operator: '张工', operated_at: '2025-05-02T10:00:00Z'
    },
    {
      id: uuidv4(), merge_group_id: groupId1, action: 'confirm',
      before_snapshot: JSON.stringify({ confirmed_by: null, confirmed_at: null }),
      after_snapshot: JSON.stringify({ confirmed_by: '张工', confirmed_at: '2025-05-03T10:00:00Z' }),
      operator: '张工', operated_at: '2025-05-03T10:00:00Z'
    },
    {
      id: uuidv4(), merge_group_id: groupId1, action: 'edit_note',
      before_snapshot: JSON.stringify({ note: '' }),
      after_snapshot: JSON.stringify({ note: '已安排清淤' }),
      operator: '张工', operated_at: '2025-05-02T10:00:00Z'
    },
    {
      id: uuidv4(), merge_group_id: groupId2, action: 'merge',
      before_snapshot: JSON.stringify({ complaint_ids: [complaintIds[4], complaintIds[5]], statuses: ['pending', 'pending'] }),
      after_snapshot: JSON.stringify({ complaint_ids: [complaintIds[4], complaintIds[5]], statuses: ['merged', 'merged'] }),
      operator: '李工', operated_at: '2025-05-05T09:00:00Z'
    },
  ]

  const transaction = db.transaction(() => {
    for (const c of complaints) {
      insertComplaint.run(c)
    }
    for (const p of photos) {
      insertPhoto.run(p)
    }
    for (const m of mergeRecords) {
      insertMergeRecord.run(m)
    }
    for (const mc of mergeRecordComplaints) {
      insertMergeRecordComplaint.run(mc)
    }
    for (const n of noteHistories) {
      insertNoteHistory.run(n)
    }
    for (const cl of confirmationLogs) {
      insertConfirmationLog.run(cl)
    }
  })

  transaction()
}
