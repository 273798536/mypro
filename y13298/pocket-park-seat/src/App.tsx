import { useState, useEffect } from 'react'
import type { SeatRecord } from './types'
import { seatService } from './services/seatService'
import { StatsPanel } from './components/StatsPanel'
import { RecordCard } from './components/RecordCard'
import { RecordDetail } from './components/RecordDetail'
import { ImportDialog } from './components/ImportDialog'
import './App.css'

function App() {
  const [records, setRecords] = useState<SeatRecord[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState<SeatRecord | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [stats, setStats] = useState(seatService.getStats())

  useEffect(() => {
    seatService.initMockData()
    refreshData()
  }, [])

  const refreshData = () => {
    setRecords(seatService.getAll())
    setStats(seatService.getStats())
    if (selectedRecord) {
      const updated = seatService.getById(selectedRecord.id)
      if (updated) {
        setSelectedRecord(updated)
      } else {
        setSelectedRecord(null)
      }
    }
  }

  const filteredRecords = records.filter(r => {
    if (activeTab === 'all') return true
    return r.status === activeTab
  })

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🪑 口袋公园座椅方案比选</h1>
          <p className="app-subtitle">GIS点位导入 · 方案确认 · 投诉归并 · 结论追踪</p>
        </div>
        <button className="btn btn-primary import-btn" onClick={() => setShowImport(true)}>
          + 从GIS导入
        </button>
      </header>

      <main className="app-main">
        <StatsPanel
          stats={stats}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="record-list">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">
              <p>暂无记录</p>
              <button className="btn btn-primary" onClick={() => setShowImport(true)}>
                + 导入GIS点位
              </button>
            </div>
          ) : (
            filteredRecords.map(record => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => setSelectedRecord(record)}
              />
            ))
          )}
        </div>
      </main>

      {selectedRecord && (
        <RecordDetail
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={refreshData}
        />
      )}

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImport={() => {
            refreshData()
            setShowImport(false)
          }}
        />
      )}
    </div>
  )
}

export default App
