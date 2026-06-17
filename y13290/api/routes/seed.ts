import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.post('/', (_req: Request, res: Response): void => {
  try {
    const seedData = [
      { name: '慢行桥北坡道', latitude: 31.2304, longitude: 121.4737, opinion: '坡度偏陡，轮椅推行困难，建议放缓至1:12', source: '2026年3月社区协调会纪要' },
      { name: '慢行天桥北坡道', latitude: 31.2305, longitude: 121.4738, opinion: '北侧坡道防滑条脱落，雨天易滑', source: '2026年3月社区协调会纪要' },
      { name: '慢行桥南坡道', latitude: 31.2290, longitude: 121.4740, opinion: '南坡道扶手高度不足，老人上下不安全', source: '2026年4月市政设计评审会' },
      { name: '慢行桥南坡道', latitude: 31.2291, longitude: 121.4741, opinion: '坡道底部排水不畅，雨后积水严重', source: '2026年4月市政设计评审会' },
      { name: '慢行桥东坡道', latitude: 31.2298, longitude: 121.4750, opinion: '东坡道照明不足，夜间通行安全隐患', source: '2026年5月街道办现场踏勘记录' },
      { name: '慢行桥东坡道', latitude: 31.2300, longitude: 121.4755, opinion: '坡道转角处需增设休息平台', source: '2026年5月街道办现场踏勘记录' },
      { name: '慢行桥西坡道', latitude: 31.2295, longitude: 121.4720, opinion: '西侧坡道与主路衔接处高差过大', source: '2026年3月社区协调会纪要' },
      { name: '慢行桥西坡道', latitude: 31.2100, longitude: 121.4900, opinion: '坡道旁绿化遮挡视线，需修剪', source: '2026年5月街道办现场踏勘记录' },
    ]

    const insert = db.prepare(
      'INSERT INTO entries (name, latitude, longitude, opinion, source) VALUES (?, ?, ?, ?, ?)'
    )

    const transaction = db.transaction(() => {
      db.prepare('UPDATE entries SET group_id = NULL').run()
      db.prepare('DELETE FROM entries').run()
      db.prepare('DELETE FROM merge_groups').run()
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('entries', 'merge_groups')").run()
      const results = []
      for (const e of seedData) {
        const result = insert.run(e.name, e.latitude, e.longitude, e.opinion, e.source)
        results.push({ id: result.lastInsertRowid, ...e })
      }
      return results
    })

    const data = transaction()
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

export default router
