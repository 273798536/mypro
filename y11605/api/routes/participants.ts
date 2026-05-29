import express from 'express'
import multer from 'multer'
import xlsx from 'xlsx'
import {
  getParticipants,
  getParticipant,
  updateParticipant,
  getStats,
  getTiers,
  createParticipantsBatch,
} from '../services/participantService'
import { getParticipantHistory } from '../services/auditService'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

const OPERATOR = 'admin'

const payChannelMap: Record<string, string> = {
  '支付宝': 'alipay',
  '微信': 'wechat',
  '微信支付': 'wechat',
  '银行卡': 'card',
  'alipay': 'alipay',
  'wechat': 'wechat',
  'card': 'card',
}

const tierMap: Record<string, { tierId: string; tierName: string }> = {
  '1': { tierId: 'tier_1', tierName: '早鸟档' },
  '2': { tierId: 'tier_2', tierName: '标准档' },
  '3': { tierId: 'tier_3', tierName: '豪华档' },
  '4': { tierId: 'tier_4', tierName: '至尊档' },
  '早鸟档': { tierId: 'tier_1', tierName: '早鸟档' },
  '标准档': { tierId: 'tier_2', tierName: '标准档' },
  '豪华档': { tierId: 'tier_3', tierName: '豪华档' },
  '至尊档': { tierId: 'tier_4', tierName: '至尊档' },
  'tier_1': { tierId: 'tier_1', tierName: '早鸟档' },
  'tier_2': { tierId: 'tier_2', tierName: '标准档' },
  'tier_3': { tierId: 'tier_3', tierName: '豪华档' },
  'tier_4': { tierId: 'tier_4', tierName: '至尊档' },
}

router.get('/', async (req, res) => {
  try {
    const { tierId, payChannel, status, hasAnomalies, search, page = 1, pageSize = 50 } = req.query

    const result = await getParticipants(
      {
        tierId: tierId as string,
        payChannel: payChannel as string,
        status: status as string,
        hasAnomalies: hasAnomalies === 'true',
        search: search as string,
      },
      Number(page),
      Number(pageSize)
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/stats', async (_req, res) => {
  try {
    const stats = await getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/tiers', async (_req, res) => {
  try {
    const tiers = await getTiers()
    res.json(tiers)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const participant = await getParticipant(req.params.id)
    if (!participant) {
      return res.status(404).json({ error: '参与人不存在' })
    }
    res.json(participant)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const participant = await updateParticipant(req.params.id, req.body, OPERATOR)
    res.json(participant)
  } catch (error) {
    if ((error as Error).message.includes('数据已被修改')) {
      return res.status(409).json({ error: (error as Error).message })
    }
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/:id/history', async (req, res) => {
  try {
    const history = await getParticipantHistory(req.params.id)
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' })
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = xlsx.utils.sheet_to_json(worksheet) as any[]

    if (rows.length === 0) {
      return res.status(400).json({ error: '文件中没有数据' })
    }

    const participants = rows.map((row, index) => {
      const userName = row['姓名'] || row['userName'] || row['name']
      const userPhone = row['手机号'] || row['userPhone'] || row['phone']
      const orderNo = row['订单号'] || row['orderNo'] || row['order_no']
      const userId = row['用户ID'] || row['userId'] || row['user_id'] || `user_${Date.now()}_${index}`
      const payChannelInput = row['支付渠道'] || row['payChannel'] || row['channel'] || 'alipay'
      const payAmount = Number(row['支付金额'] || row['payAmount'] || row['amount'] || 0)
      const earlyBirdDiscount = Number(row['早鸟折扣'] || row['earlyBirdDiscount'] || 0)
      const giftValue = Number(row['赠品价值'] || row['giftValue'] || 0)
      const giftShippedInput = row['赠品已发货'] || row['giftShipped'] || false
      const tierInput = row['档位'] || row['tier'] || row['tierId'] || 'tier_2'

      if (!userName || !userPhone || !orderNo) {
        throw new Error(`第${index + 2}行缺少必填字段：姓名、手机号、订单号`)
      }

      const payChannel = payChannelMap[String(payChannelInput)] || 'alipay'
      const tier = tierMap[String(tierInput)] || { tierId: 'tier_2', tierName: '标准档' }
      const giftShipped = Boolean(giftShippedInput) && giftShippedInput !== '否' && giftShippedInput !== 'false'

      return {
        userId,
        userName,
        userPhone,
        orderNo,
        tierId: tier.tierId,
        tierName: tier.tierName,
        payChannel,
        payAmount,
        earlyBirdDiscount,
        giftValue,
        giftShipped,
        status: 'pending',
      }
    })

    const result = await createParticipantsBatch(participants, OPERATOR)

    res.json({
      success: true,
      count: result.length,
      participants: result,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/batch', async (req, res) => {
  try {
    const { participants } = req.body
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: '请提供参与人数据' })
    }

    const result = await createParticipantsBatch(participants, OPERATOR)

    res.json({
      success: true,
      count: result.length,
      participants: result,
    })
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

export default router
