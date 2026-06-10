import { Router, type Request, type Response } from 'express'
import {
  getAllTraceLogs,
  resolveTraceLog,
} from '../services/errorService.js'
import type { ApiResponse, TraceLog } from '../types/index.js'

const router = Router()

router.get('/list', (req: Request, res: Response) => {
  try {
    const logs = getAllTraceLogs()
    const response: ApiResponse<TraceLog[]> = {
      success: true,
      data: logs,
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'LIST_FAILED',
        message: '获取异常留痕列表失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

router.put('/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { resolution } = req.body as { resolution?: string }

    if (!resolution || resolution.trim() === '') {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'RESOLUTION_MISSING',
          message: '处理说明不能为空',
          actionable: '请填写具体的处理措施和结果后再提交',
        },
      }
      return res.status(400).json(response)
    }

    const log = resolveTraceLog(id, resolution)

    if (!log) {
      const response: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'LOG_NOT_FOUND',
          message: `未找到 ID 为 ${id} 的异常留痕记录`,
          actionable: '请检查记录 ID 是否正确，或返回列表页重新选择',
        },
      }
      return res.status(404).json(response)
    }

    const response: ApiResponse<TraceLog> = {
      success: true,
      data: log,
      error: null,
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'RESOLVE_FAILED',
        message: '处理异常留痕失败',
        actionable: '请稍后重试，或联系系统管理员',
      },
    }
    res.status(500).json(response)
  }
})

export default router
