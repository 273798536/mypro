import { FileText, Stethoscope, Receipt, ScrollText, User, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { Material, PolicyCard, MedicalRecord, Invoice, Clause } from '@/types'

interface MaterialCardProps {
  material: Material
  isSelected: boolean
  isJudged: boolean
  isCorrect: boolean | null
  onClick: () => void
}

const iconMap = {
  policyCard: FileText,
  medicalRecord: Stethoscope,
  invoice: Receipt,
  clause: ScrollText,
}

function renderContent(material: Material) {
  switch (material.materialType) {
    case 'policyCard': {
      const m = material as PolicyCard
      return (
        <>
          <p>保单号: {m.policyNumber}</p>
          <p>险种: {m.insuranceType}</p>
          <p>保额: ¥{m.coverageAmount.toLocaleString()}</p>
          <p>生效日期: {m.effectiveDate}</p>
          <p>等待期: {m.waitingPeriodDays}天</p>
        </>
      )
    }
    case 'medicalRecord': {
      const m = material as MedicalRecord
      return (
        <>
          <p>诊断: {m.diagnosis}</p>
          <p>就诊日期: {m.visitDate}</p>
          <p>医院: {m.hospitalName}</p>
          <p>关联保单: {m.policyCardId}</p>
        </>
      )
    }
    case 'invoice': {
      const m = material as Invoice
      return (
        <>
          <p>发票号: {m.invoiceNumber}</p>
          <p>金额: ¥{m.amount.toLocaleString()}</p>
          <p>开票日期: {m.invoiceDate}</p>
        </>
      )
    }
    case 'clause': {
      const m = material as Clause
      return (
        <>
          <p>条款名称: {m.clauseName}</p>
          <p>内容: {m.content}</p>
          <p>生效日期: {m.effectiveDate}</p>
          <p>失效日期: {m.expirationDate}</p>
          {m.isExpired && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-700 text-red-100 rounded">已过期</span>
          )}
        </>
      )
    }
  }
}

export default function MaterialCard({ material, isSelected, isJudged, isCorrect, onClick }: MaterialCardProps) {
  const Icon = iconMap[material.materialType]

  return (
    <div
      onClick={onClick}
      className={`relative rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-l-4 border-[#d4a843] shadow-[0_0_12px_rgba(212,168,67,0.3)]'
          : 'border-l-4 border-transparent'
      } bg-[#f5f0e8] text-gray-900`}
    >
      {isJudged && (
        <div className="absolute top-2 right-2">
          {isCorrect ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-[#d4a843] shrink-0" />
        <h3 className="text-sm font-semibold truncate">
          {material.materialType === 'policyCard'
            ? '保单'
            : material.materialType === 'medicalRecord'
            ? '医疗记录'
            : material.materialType === 'invoice'
            ? '发票'
            : '条款'}
        </h3>
      </div>

      <div className="text-xs space-y-0.5 mb-3">{renderContent(material)}</div>

      <div className="flex items-center justify-between text-xs text-gray-600 border-t border-gray-300 pt-2">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          来源: {material.sourcePerson}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {material.importTime}
        </span>
      </div>
    </div>
  )
}
