import { useNavigate } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { useReviewStore } from '@/store'
import VerifyButton from '@/components/VerifyButton'
import type { HandoverItem } from '@/types'

type VerifyStatus = HandoverItem['verificationStatus']

const statusBadge: Record<VerifyStatus, { label: string; className: string }> = {
  pending: { label: '待验证', className: 'bg-gray-600 text-gray-300' },
  verified: { label: '已验证', className: 'bg-green-600 text-white' },
  supplement: { label: '待补充', className: 'bg-yellow-600 text-white' },
  rejected: { label: '已驳回', className: 'bg-red-600 text-white' },
}

export default function HandoverTable() {
  const { handoverItems, annotations, updateHandoverItemStatus } = useReviewStore()
  const navigate = useNavigate()

  const handleStatusChange = (itemId: string, status: VerifyStatus) => {
    const nextStatus: Record<VerifyStatus, VerifyStatus> = {
      pending: 'verified',
      verified: 'supplement',
      supplement: 'rejected',
      rejected: 'verified',
    }
    updateHandoverItemStatus(itemId, nextStatus[status], '当前用户')
  }

  const handleDirectStatus = (itemId: string, status: VerifyStatus) => {
    updateHandoverItemStatus(itemId, status, '当前用户')
  }

  const getAnnotationContent = (annotationId: string) => {
    return annotations.find((a) => a.id === annotationId)
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800">
            <th className="px-4 py-3 text-left font-medium text-slate-300">序号</th>
            <th className="px-4 py-3 text-left font-medium text-slate-300">批注来源</th>
            <th className="px-4 py-3 text-left font-medium text-slate-300">问题描述</th>
            <th className="px-4 py-3 text-left font-medium text-slate-300">截图预览</th>
            <th className="px-4 py-3 text-left font-medium text-slate-300">确认状态</th>
            <th className="px-4 py-3 text-left font-medium text-slate-300">操作</th>
          </tr>
        </thead>
        <tbody>
          {handoverItems.map((item, index) => {
            const annotation = getAnnotationContent(item.annotationId)
            const badge = statusBadge[item.verificationStatus]
            return (
              <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                <td className="px-4 py-3 text-slate-300">{index + 1}</td>
                <td className="px-4 py-3">
                  <button
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                    onClick={() => navigate('/annotations')}
                  >
                    <Link2 size={14} />
                    {annotation ? `批注 ${annotation.id}` : item.annotationId}
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-300 max-w-xs">{item.description}</td>
                <td className="px-4 py-3">
                  {item.screenshotDataUrl ? (
                    <img
                      src={item.screenshotDataUrl}
                      alt="截图"
                      className="h-10 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-16 items-center justify-center rounded bg-slate-700 text-[10px] text-slate-500">
                      暂无截图
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded bg-green-700/30 px-2 py-1 text-xs text-green-400 hover:bg-green-700/50"
                      onClick={() => handleDirectStatus(item.id, 'verified')}
                    >
                      已验证
                    </button>
                    <button
                      className="rounded bg-yellow-700/30 px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-700/50"
                      onClick={() => handleDirectStatus(item.id, 'supplement')}
                    >
                      待补充
                    </button>
                    <button
                      className="rounded bg-red-700/30 px-2 py-1 text-xs text-red-400 hover:bg-red-700/50"
                      onClick={() => handleDirectStatus(item.id, 'rejected')}
                    >
                      驳回
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
          {handoverItems.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                暂无交接项目
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
