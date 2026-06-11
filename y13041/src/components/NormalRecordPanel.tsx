import type { NormalPaymentRecord } from '@/shared/types'

interface NormalRecordPanelProps {
  records: NormalPaymentRecord[]
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function NormalRecordPanel({ records }: NormalRecordPanelProps) {
  return (
    <div className="h-full flex flex-col rounded-lg bg-white shadow-sm border border-slatefinance-100">
      <div className="px-5 py-4 border-b border-slatefinance-100">
        <h3 className="text-base font-semibold text-slatefinance-800">关联正常缴费记录</h3>
      </div>
      <div className="flex-1 overflow-auto">
        {records.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slatefinance-400 text-sm">
            暂无关联正常记录
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slatefinance-50 sticky top-0">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-slatefinance-500">缴费月份</th>
                <th className="px-5 py-3 text-left font-medium text-slatefinance-500">金额</th>
                <th className="px-5 py-3 text-left font-medium text-slatefinance-500">实付日期</th>
              </tr>
            </thead>
            <tbody>
              {(records ?? []).map((record) => (
                <tr key={record.id} className="border-t border-slatefinance-100 hover:bg-slatefinance-50/50">
                  <td className="px-5 py-3 text-slatefinance-700">{record.paymentMonth}</td>
                  <td className="px-5 py-3 text-slatefinance-800 font-medium">{formatCurrency(record.amount)}</td>
                  <td className="px-5 py-3 text-slatefinance-600">
                    {new Date(record.paidAt).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
