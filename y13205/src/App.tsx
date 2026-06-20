import { useState, useCallback } from 'react'
import {
  TrackCatalogEntry, ReviewRecord, NoteChangeEntry, ReviewRunResult,
  RecordSource, AliasConflict,
  SAMPLE_CATALOG, SAMPLE_OLD_CATALOG, SAMPLE_RECORDS, runReview,
} from './types'
import ReviewTable from './ReviewTable'
import CatalogView from './CatalogView'
import AliasConflictPanel from './AliasConflictPanel'
import NoteHistoryPanel from './NoteHistoryPanel'
import GuidePanel from './GuidePanel'
import DeliveryPanel from './DeliveryPanel'
import './App.css'

type Tab = 'review' | 'catalog' | 'guide' | 'delivery'

export default function App() {
  const [catalog] = useState<TrackCatalogEntry[]>(SAMPLE_CATALOG)
  const [oldCatalog] = useState<TrackCatalogEntry[]>(SAMPLE_OLD_CATALOG)
  const [records, setRecords] = useState<ReviewRecord[]>(SAMPLE_RECORDS)
  const [noteChanges, setNoteChanges] = useState<NoteChangeEntry[]>([])
  const [result, setResult] = useState<ReviewRunResult>(() =>
    runReview(SAMPLE_CATALOG, SAMPLE_OLD_CATALOG, SAMPLE_RECORDS)
  )
  const [tab, setTab] = useState<Tab>('review')
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [showApiResponse, setShowApiResponse] = useState(false)

  const handleRerun = useCallback(() => {
    const r = runReview(catalog, oldCatalog, records)
    setResult(r)
  }, [catalog, oldCatalog, records])

  const handleNoteChange = useCallback((recordId: string, newNote: string, changedBy: string) => {
    const oldRecord = records.find(r => r.id === recordId)
    if (!oldRecord) return
    const changeId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `nc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const change: NoteChangeEntry = {
      id: changeId,
      recordId,
      oldValue: oldRecord.note,
      newValue: newNote,
      changedBy,
      changedAt: new Date().toLocaleString('zh-CN'),
    }
    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, note: newNote } : r))
    setResult(prevResult => ({
      ...prevResult,
      records: prevResult.records.map(r => r.id === recordId ? { ...r, note: newNote } : r),
    }))
    setNoteChanges(pc => [...pc, change])
  }, [records])

  const sourceTagClass = (source: RecordSource): string => {
    switch (source) {
      case 'old_catalog': return 'source-old'
      case 'normal': return 'source-normal'
      case 'verbal_note': return 'source-verbal'
    }
  }

  const sourceTagLabel = (source: RecordSource): string => {
    switch (source) {
      case 'old_catalog': return '旧版曲目表'
      case 'normal': return '正常记录'
      case 'verbal_note': return '口头备注'
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>录音棚时码版本复核</h1>
        <p className="subtitle">分清谁影响了结论 · 追到曲目表原始说法 · 备注改动进历史</p>
      </header>

      <nav className="tabs">
        {(['review', 'catalog', 'guide', 'delivery'] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'review' ? '复核分析' : t === 'catalog' ? '曲目表' : t === 'guide' ? '说明' : '交付说明'}
          </button>
        ))}
      </nav>

      {tab === 'review' && (
        <ReviewTable
          result={result}
          catalog={catalog}
          expandedRecord={expandedRecord}
          setExpandedRecord={setExpandedRecord}
          sourceTagClass={sourceTagClass}
          sourceTagLabel={sourceTagLabel}
          showApiResponse={showApiResponse}
          setShowApiResponse={setShowApiResponse}
          onRerun={handleRerun}
          onNoteChange={handleNoteChange}
          noteChanges={noteChanges}
        />
      )}

      {tab === 'catalog' && (
        <CatalogView catalog={catalog} oldCatalog={oldCatalog} />
      )}

      {tab === 'guide' && (
        <GuidePanel onRerun={handleRerun} result={result} />
      )}

      {tab === 'delivery' && (
        <DeliveryPanel result={result} catalog={catalog} noteChanges={noteChanges} />
      )}
    </div>
  )
}
