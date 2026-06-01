import { useState } from 'react'
import { Bell, Wrench, FileText, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import AlarmRecordForm from '@/components/AlarmRecordForm'
import MaintenanceResultForm from '@/components/MaintenanceResultForm'
import LocalizationReportImport from '@/components/LocalizationReportImport'
import ConflictPanel from '@/components/ConflictPanel'
import BoundaryWarnings from '@/components/BoundaryWarnings'
import { useBayesianStore } from '@/store/bayesianStore'
import { cn } from '@/lib/utils'

type Tab = 'alarm' | 'maintenance' | 'report'

export default function EvidenceInput() {
  const [activeTab, setActiveTab] = useState<Tab>('alarm')
  const [showConflicts, setShowConflicts] = useState(false)
  const boundaryWarnings = useBayesianStore(s => s.boundaryWarnings)
  const unitConflicts = useBayesianStore(s => s.unitConflicts)
  const calibrationConflicts = useBayesianStore(s => s.calibrationConflicts)
  const unresolvedConflicts = unitConflicts.filter(c => !c.resolved).length + calibrationConflicts.length

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'alarm', label: '报警记录', icon: <Bell size={16} /> },
    { key: 'maintenance', label: '维修结果', icon: <Wrench size={16} /> },
    { key: 'report', label: '定位报告', icon: <FileText size={16} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all flex-1 justify-center",
              activeTab === tab.key
                ? "bg-zinc-700/60 text-amber-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4">
        {activeTab === 'alarm' && <AlarmRecordForm />}
        {activeTab === 'maintenance' && <MaintenanceResultForm />}
        {activeTab === 'report' && <LocalizationReportImport />}
      </div>

      {boundaryWarnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <AlertTriangle size={16} />
            <span className="font-medium">边界值警告</span>
            <span className="text-xs text-zinc-500">({boundaryWarnings.length})</span>
          </div>
          <BoundaryWarnings />
        </div>
      )}

      <div>
        <button
          onClick={() => setShowConflicts(!showConflicts)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors w-full"
        >
          {showConflicts ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>冲突检测面板</span>
          {unresolvedConflicts > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">
              {unresolvedConflicts}
            </span>
          )}
        </button>
        {showConflicts && (
          <div className="mt-2 bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4">
            <ConflictPanel />
          </div>
        )}
      </div>
    </div>
  )
}
