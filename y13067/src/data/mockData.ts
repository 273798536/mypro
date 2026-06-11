import type { Bar, Fixture, Collision, Annotation, SupplementMaterial, BarFrame, ScreenshotMark } from '@/types'

export const mockBars: Bar[] = [
  { id: 'bar-01', name: '1号吊杆', positionX: -6, positionY: 8, positionZ: -4, length: 12, type: 'bar' },
  { id: 'bar-02', name: '2号吊杆', positionX: -6, positionY: 7.5, positionZ: -2, length: 12, type: 'bar' },
  { id: 'bar-03', name: '3号吊杆', positionX: -6, positionY: 7, positionZ: 0, length: 12, type: 'bar' },
  { id: 'bar-04', name: '4号吊杆', positionX: -6, positionY: 7.2, positionZ: 2, length: 12, type: 'bar' },
  { id: 'bar-05', name: '5号吊杆', positionX: -6, positionY: 8.5, positionZ: 4, length: 12, type: 'bar' },
  { id: 'bar-06', name: '6号吊杆', positionX: -6, positionY: 6.8, positionZ: 6, length: 12, type: 'bar' },
  { id: 'bar-07', name: '7号吊杆', positionX: -6, positionY: 7.3, positionZ: 8, length: 12, type: 'bar' },
  { id: 'bar-08', name: '8号吊杆', positionX: -6, positionY: 8.2, positionZ: 10, length: 12, type: 'bar' },
  { id: 'bar-09', name: '9号吊杆', positionX: -6, positionY: 6.5, positionZ: 12, length: 12, type: 'bar' },
  { id: 'bar-10', name: '10号吊杆', positionX: -6, positionY: 7.8, positionZ: 14, length: 12, type: 'bar' },
  { id: 'bar-11', name: '11号吊杆', positionX: -6, positionY: 7.1, positionZ: 16, length: 10, type: 'bar' },
  { id: 'bar-12', name: '12号吊杆', positionX: -5, positionY: 6.9, positionZ: 18, length: 10, type: 'bar' },
  { id: 'bar-13', name: '13号吊杆', positionX: -5, positionY: 8.0, positionZ: 20, length: 10, type: 'bar' },
  { id: 'bar-14', name: '14号吊杆', positionX: -5, positionY: 7.4, positionZ: 22, length: 10, type: 'bar' },
  { id: 'bar-15', name: '15号吊杆', positionX: -5, positionY: 6.6, positionZ: 24, length: 10, type: 'bar' },
  { id: 'bar-16', name: '16号吊杆', positionX: -5, positionY: 8.3, positionZ: 26, length: 10, type: 'bar' },
  { id: 'bar-17', name: '17号吊杆', positionX: -5, positionY: 7.6, positionZ: 28, length: 8, type: 'bar' },
  { id: 'bar-18', name: '18号吊杆', positionX: -4, positionY: 6.4, positionZ: 30, length: 8, type: 'bar' },
  { id: 'bar-19', name: '19号吊杆', positionX: -4, positionY: 7.9, positionZ: 32, length: 8, type: 'bar' },
  { id: 'bar-20', name: '20号吊杆', positionX: -4, positionY: 8.1, positionZ: 34, length: 8, type: 'bar' },
  { id: 'scenery-01', name: '景片A', positionX: -4, positionY: 5.5, positionZ: 5, length: 6, type: 'scenery' },
  { id: 'scenery-02', name: '景片B', positionX: 2, positionY: 6.2, positionZ: 15, length: 5, type: 'scenery' },
]

export const mockFixtures: Fixture[] = [
  { id: 'fix-01', name: '面光灯1', barId: 'bar-01', offsetX: -3, offsetY: -0.5, offsetZ: 0, fixtureType: '面光' },
  { id: 'fix-02', name: '面光灯2', barId: 'bar-01', offsetX: 3, offsetY: -0.5, offsetZ: 0, fixtureType: '面光' },
  { id: 'fix-03', name: '顶光灯1', barId: 'bar-03', offsetX: -2, offsetY: -0.6, offsetZ: 0, fixtureType: '顶光' },
  { id: 'fix-04', name: '顶光灯2', barId: 'bar-03', offsetX: 2, offsetY: -0.6, offsetZ: 0, fixtureType: '顶光' },
  { id: 'fix-05', name: '侧光灯1', barId: 'bar-05', offsetX: -4, offsetY: -0.4, offsetZ: 0, fixtureType: '侧光' },
  { id: 'fix-06', name: '侧光灯2', barId: 'bar-05', offsetX: 4, offsetY: -0.4, offsetZ: 0, fixtureType: '侧光' },
  { id: 'fix-07', name: '追光灯1', barId: 'bar-07', offsetX: 0, offsetY: -0.7, offsetZ: 0, fixtureType: '追光' },
  { id: 'fix-08', name: '逆光灯1', barId: 'bar-09', offsetX: -1, offsetY: -0.5, offsetZ: 0, fixtureType: '逆光' },
  { id: 'fix-09', name: '逆光灯2', barId: 'bar-09', offsetX: 1, offsetY: -0.5, offsetZ: 0, fixtureType: '逆光' },
  { id: 'fix-10', name: '染色灯1', barId: 'bar-11', offsetX: -2, offsetY: -0.6, offsetZ: 0, fixtureType: '染色' },
  { id: 'fix-11', name: '染色灯2', barId: 'bar-11', offsetX: 2, offsetY: -0.6, offsetZ: 0, fixtureType: '染色' },
  { id: 'fix-12', name: '电脑灯1', barId: 'bar-13', offsetX: 0, offsetY: -0.8, offsetZ: 0, fixtureType: '电脑灯' },
  { id: 'fix-13', name: '电脑灯2', barId: 'bar-15', offsetX: -1.5, offsetY: -0.7, offsetZ: 0, fixtureType: '电脑灯' },
  { id: 'fix-14', name: '电脑灯3', barId: 'bar-15', offsetX: 1.5, offsetY: -0.7, offsetZ: 0, fixtureType: '电脑灯' },
  { id: 'fix-15', name: '光束灯1', barId: 'bar-17', offsetX: 0, offsetY: -0.5, offsetZ: 0, fixtureType: '光束' },
  { id: 'fix-16', name: '频闪灯1', barId: 'bar-19', offsetX: 0, offsetY: -0.4, offsetZ: 0, fixtureType: '频闪' },
]

export const mockBarFrames: BarFrame[] = (() => {
  const frames: BarFrame[] = []
  for (let f = 0; f < 10; f++) {
    mockBars.forEach((bar) => {
      const baseY = bar.positionY
      const variation = Math.sin(f * 0.8 + parseInt(bar.id.replace(/\D/g, '')) * 0.5) * 1.2
      frames.push({
        barId: bar.id,
        frameIndex: f,
        positionY: baseY + variation,
      })
    })
  }
  return frames
})()

export const mockCollisions: Collision[] = [
  { id: 'col-01', objectAId: 'bar-03', objectBId: 'bar-04', distance: 0.15, frameIndex: 3, status: 'collision' },
  { id: 'col-02', objectAId: 'bar-06', objectBId: 'bar-07', distance: 0.22, frameIndex: 5, status: 'collision' },
  { id: 'col-03', objectAId: 'bar-09', objectBId: 'scenery-01', distance: 0.08, frameIndex: 3, status: 'collision' },
  { id: 'col-04', objectAId: 'bar-11', objectBId: 'bar-12', distance: 0.28, frameIndex: 7, status: 'pending_review' },
  { id: 'col-05', objectAId: 'bar-15', objectBId: 'scenery-02', distance: 0.18, frameIndex: 4, status: 'collision' },
  { id: 'col-06', objectAId: 'bar-18', objectBId: 'bar-19', distance: 0.45, frameIndex: 2, status: 'safe' },
]

export const mockAnnotations: Annotation[] = [
  { id: 'ann-01', collisionId: 'col-01', authorId: 'user-lin', authorName: '林姐', content: '3号与4号杆间距不足，灯光师在操作时容易误触', batchNo: 'B001', timestamp: '2026-06-01T09:30:00', type: 'review_note' },
  { id: 'ann-02', collisionId: 'col-01', authorId: 'user-wang', authorName: '王工', content: '建议3号杆下调0.5m或4号杆上调0.3m', batchNo: 'B001', timestamp: '2026-06-01T10:15:00', type: 'action_hint' },
  { id: 'ann-03', collisionId: 'col-02', authorId: 'user-lin', authorName: '林姐', content: '6号与7号杆在演出第二幕时有碰撞风险', batchNo: 'B001', timestamp: '2026-06-01T11:00:00', type: 'review_note' },
  { id: 'ann-04', collisionId: 'col-03', authorId: 'user-zhao', authorName: '赵老师', content: '9号杆与景片A在换景时干涉', batchNo: 'B002', timestamp: '2026-06-02T14:20:00', type: 'review_note' },
  { id: 'ann-05', collisionId: 'col-03', authorId: 'user-wang', authorName: '王工', content: '请将景片A高度降低0.4m，或将9号杆上升0.3m', batchNo: 'B002', timestamp: '2026-06-02T15:00:00', type: 'action_hint' },
  { id: 'ann-06', collisionId: 'col-05', authorId: 'user-lin', authorName: '林姐', content: '15号杆与景片B间隙过小', batchNo: 'B002', timestamp: '2026-06-02T16:30:00', type: 'review_note' },
  { id: 'ann-07', collisionId: 'col-04', authorId: 'user-zhao', authorName: '赵老师', content: '待确认11号与12号杆是否需要调整', batchNo: 'B003', timestamp: '2026-06-05T10:00:00', type: 'review_note' },
]

export const mockSupplements: SupplementMaterial[] = [
  { id: 'sup-01', annotationId: 'ann-01', batchNo: 'B002', content: '附3-4号杆间距测量照片', timestamp: '2026-06-02T09:00:00', fileType: 'image' },
  { id: 'sup-02', annotationId: 'ann-03', batchNo: 'B003', content: '6-7号杆第二幕运动轨迹图', timestamp: '2026-06-05T09:00:00', fileType: 'document' },
  { id: 'sup-03', annotationId: 'ann-06', batchNo: 'B003', content: '景片B设计图纸更新版', timestamp: '2026-06-05T11:00:00', fileType: 'document' },
]

const placeholderSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0D1117"/>
      <stop offset="100%" style="stop-color:#161B22"/>
    </linearGradient>
  </defs>
  <rect width="480" height="280" fill="url(#bg)"/>
  <g stroke="#30363D" stroke-width="1" opacity="0.5">
    <line x1="0" y1="230" x2="480" y2="230"/>
    ${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 40}" y1="230" x2="${i * 40}" y2="280"/>`).join('')}
    ${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${230 + i * 10}" x2="480" y2="${230 + i * 10}"/>`).join('')}
  </g>
  <g>
    <rect x="30" y="80" width="420" height="8" rx="4" fill="#8899AA"/>
    <rect x="50" y="100" width="380" height="8" rx="4" fill="#FF4757">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
    </rect>
    <rect x="70" y="120" width="340" height="8" rx="4" fill="#E8A838"/>
    <rect x="90" y="140" width="300" height="8" rx="4" fill="#8899AA"/>
    <rect x="110" y="160" width="260" height="8" rx="4" fill="#8899AA"/>
    <rect x="130" y="180" width="220" height="8" rx="4" fill="#8B7355"/>
  </g>
  <g>
    <rect x="100" y="70" width="12" height="12" rx="2" fill="#FFD700"/>
    <rect x="200" y="110" width="12" height="12" rx="2" fill="#87CEEB"/>
    <rect x="300" y="130" width="12" height="12" rx="2" fill="#98FB98"/>
    <rect x="400" y="170" width="12" height="12" rx="2" fill="#FFA500"/>
  </g>
  <text x="20" y="30" fill="#8B949E" font-family="monospace" font-size="12">THEATER BAR ARRAY</text>
  <text x="20" y="50" fill="#E8A838" font-family="sans-serif" font-size="10">● COLLISION DETECTED</text>
  <text x="380" y="30" fill="#484F58" font-family="monospace" font-size="11">PREVIEW</text>
</svg>
`)}`

export const mockScreenshots: ScreenshotMark[] = [
  { id: 'scr-01', collisionId: 'col-01', objectId: 'bar-03', imageData: placeholderSvg, label: '3号杆碰撞区域', labelType: 'pending_material', note: '间距0.15m，低于安全阈值', timestamp: Date.now() - 86400000 * 2 },
  { id: 'scr-02', collisionId: 'col-02', objectId: 'bar-06', imageData: placeholderSvg, label: '6号杆碰撞区域', labelType: 'manual_override', note: '已人工确认需要调整', timestamp: Date.now() - 86400000 },
  { id: 'scr-03', collisionId: 'col-03', objectId: 'bar-09', imageData: placeholderSvg, label: '9号杆与景片', labelType: 'resolved', note: '已调整景片高度', timestamp: Date.now() - 3600000 },
  { id: 'scr-04', collisionId: 'col-05', objectId: 'bar-15', imageData: placeholderSvg, label: '15号杆与景片B', labelType: 'pending_material', note: '等待补充材料', timestamp: Date.now() - 1800000 },
]
