import { useState } from 'react'
import { FileText, Stethoscope, Receipt, ScrollText, Check } from 'lucide-react'
import MaterialCard from '@/components/MaterialCard'
import type { Material, PolicyCard, MedicalRecord, Invoice, Clause, Judgment } from '@/types'

interface MaterialPanelProps {
  policyCards: PolicyCard[]
  medicalRecords: MedicalRecord[]
  invoices: Invoice[]
  clauses: Clause[]
  selectedMaterialId: string | null
  judgments: Judgment[]
  onSelectMaterial: (id: string | null) => void
}

type TabKey = 'policyCard' | 'medicalRecord' | 'invoice' | 'clause'

const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: 'policyCard', label: '保单卡', icon: FileText },
  { key: 'medicalRecord', label: '病历线索', icon: Stethoscope },
  { key: 'invoice', label: '发票', icon: Receipt },
  { key: 'clause', label: '免赔条款', icon: ScrollText },
]

export default function MaterialPanel({
  policyCards, medicalRecords, invoices, clauses,
  selectedMaterialId, judgments, onSelectMaterial,
}: MaterialPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('policyCard')

  const materialMap: Record<TabKey, Material[]> = {
    policyCard: policyCards,
    medicalRecord: medicalRecords,
    invoice: invoices,
    clause: clauses,
  }

  const materials = materialMap[activeTab]

  return (
    <div className="flex flex-col h-full bg-[#1a1f2e] rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-700">
        {tabs.map(({ key, label, icon: Icon }) => {
          const count = materialMap[key].length
          const judged = materialMap[key].filter(m => judgments.some(j => j.materialId === m.id)).length
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1 py-3 text-xs font-medium transition-colors border-b-2 ${
                isActive
                  ? 'text-[#d4a843] border-[#d4a843]'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label} ({count})</span>
              {judged > 0 && <Check className="w-3 h-3 text-green-400" />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {materials.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">暂无此类材料</p>
        ) : (
          materials.map(m => {
            const judgment = judgments.find(j => j.materialId === m.id)
            return (
              <MaterialCard
                key={m.id}
                material={m}
                isSelected={m.id === selectedMaterialId}
                isJudged={!!judgment}
                isCorrect={judgment?.isCorrect ?? null}
                onClick={() => onSelectMaterial(m.id === selectedMaterialId ? null : m.id)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
