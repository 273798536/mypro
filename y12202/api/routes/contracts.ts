import { Router, type Request, type Response } from 'express'
import { listContracts, getContractDetail, createNewContract } from '../services/contract.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const contracts = listContracts()
    res.json({ success: true, data: contracts })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const detail = getContractDetail(req.params.id)
    if (!detail) {
      res.status(404).json({ success: false, error: '合同不存在' })
      return
    }
    res.json({ success: true, data: detail })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { contract_no, borrower_name, borrower_id, amount, term, start_date, end_date, rate, status, created_by } = req.body
    if (!contract_no || !borrower_name || !borrower_id || !amount || !start_date || !end_date || !created_by) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const contract = createNewContract({
      contract_no,
      borrower_name,
      borrower_id,
      amount,
      term: term ?? '12个月',
      start_date,
      end_date,
      rate: rate ?? 4.35,
      status: status ?? 'active',
      created_by,
    })
    res.status(201).json({ success: true, data: contract })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
