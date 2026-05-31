import { useState, useEffect } from 'react'
import { Music, AlertTriangle, Calendar, Download, BarChart3, Database, Clock, Package, Disc, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { LedgerDashboardData, RiskAlert, LicenseAgreement, SamplePack, TrackProject, SampleUsage } from '../shared/types'

const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  none: '#64748b'
}

const LICENSE_TYPE_LABELS: Record<string, string> = {
  'commercial': '商业授权',
  'non-commercial': '非商用授权',
  'royalty-free': '免版税',
  'custom': '自定义'
}

function App() {
  const [data, setData] = useState<LedgerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'licenses' | 'packs' | 'tracks' | 'versions'>('overview')
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [showDiffModal, setShowDiffModal] = useState(false)
  const [diffData, setDiffData] = useState<any>(null)
  const [licenses, setLicenses] = useState<LicenseAgreement[]>([])
  const [packs, setPacks] = useState<SamplePack[]>([])
  const [tracks, setTracks] = useState<TrackProject[]>([])
  const [usages, setUsages] = useState<SampleUsage[]>([])

  useEffect(() => {
    fetchData()
    fetchAllData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllData = async () => {
    try {
      const [licRes, packRes, trackRes, usageRes] = await Promise.all([
        fetch('/api/licenses'),
        fetch('/api/sample-packs'),
        fetch('/api/tracks'),
        fetch('/api/usages')
      ])
      setLicenses(await licRes.json())
      setPacks(await packRes.json())
      setTracks(await trackRes.json())
      setUsages(await usageRes.json())
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  const handleExport = async (format: 'json' | 'excel') => {
    window.open(`/api/export/${format}`, '_blank')
  }

  const handleCreateSnapshot = async () => {
    const desc = prompt('请输入快照描述:', '手动快照')
    if (desc === null) return
    try {
      await fetch('/api/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc })
      })
      fetchData()
    } catch (error) {
      console.error('Failed to create snapshot:', error)
    }
  }

  const handleCompareVersions = async (fromId: string, toId: string) => {
    try {
      const res = await fetch(`/api/versions/compare?from=${fromId}&to=${toId}`)
      const diff = await res.json()
      setDiffData(diff)
      setShowDiffModal(true)
    } catch (error) {
      console.error('Failed to compare versions:', error)
    }
  }

  const handleUpdateLicense = async (licenseId: string) => {
    const newDate = prompt('请输入新的到期日期 (YYYY-MM-DD):')
    if (!newDate) return
    try {
      await fetch(`/api/licenses/${licenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validUntil: newDate })
      })
      fetchData()
      fetchAllData()
    } catch (error) {
      console.error('Failed to update license:', error)
    }
  }

  if (loading || !data) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner"></div>
          加载中...
        </div>
      </div>
    )
  }

  const riskPieData = [
    { name: '严重风险', value: data.risks.filter(r => r.level === 'critical').length, color: COLORS.critical },
    { name: '高风险', value: data.risks.filter(r => r.level === 'high').length, color: COLORS.high },
    { name: '中风险', value: data.risks.filter(r => r.level === 'medium').length, color: COLORS.medium },
    { name: '低风险', value: data.risks.filter(r => r.level === 'low').length, color: COLORS.low }
  ].filter(d => d.value > 0)

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <Music size={28} style={{ color: '#60a5fa' }} />
            <h1>采样包授权台账</h1>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleCreateSnapshot}>
              <Clock size={16} />
              创建快照
            </button>
            <button className="btn btn-secondary" onClick={() => handleExport('excel')}>
              <Download size={16} />
              导出 Excel
            </button>
            <button className="btn btn-secondary" onClick={() => handleExport('json')}>
              <Database size={16} />
              导出 JSON
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">采样包总数</span>
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                <Package size={20} style={{ color: '#3b82f6' }} />
              </div>
            </div>
            <div className="stat-value">{data.summary.totalPacks}</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">授权协议</span>
              <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
                <BarChart3 size={20} style={{ color: '#a855f7' }} />
              </div>
            </div>
            <div className="stat-value">{data.summary.totalLicenses}</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">活跃曲目</span>
              <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <Disc size={20} style={{ color: '#22c55e' }} />
              </div>
            </div>
            <div className="stat-value">{data.summary.activeTracks}</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-label">累计投入</span>
              <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.2)' }}>
                <Calendar size={20} style={{ color: '#eab308' }} />
              </div>
            </div>
            <div className="stat-value">¥{data.summary.totalCost.toLocaleString()}</div>
          </div>
        </div>

        <div className="tabs">
          <div className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            风险概览
          </div>
          <div className={`tab ${activeTab === 'licenses' ? 'active' : ''}`} onClick={() => setActiveTab('licenses')}>
            授权管理
          </div>
          <div className={`tab ${activeTab === 'packs' ? 'active' : ''}`} onClick={() => setActiveTab('packs')}>
            采样包
          </div>
          <div className={`tab ${activeTab === 'tracks' ? 'active' : ''}`} onClick={() => setActiveTab('tracks')}>
            曲目项目
          </div>
          <div className={`tab ${activeTab === 'versions' ? 'active' : ''}`} onClick={() => setActiveTab('versions')}>
            版本历史
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="chart-container">
                <div className="chart-title">风险分布</div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {riskPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <div className="chart-title">购买与发行时间线</div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Bar dataKey="purchases" name="采样包购买" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="releases" name="曲目发行" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="section">
              <div className="section-header">
                <div className="section-title">
                  <AlertTriangle size={20} style={{ color: '#eab308' }} />
                  风险预警
                  <span className="risk-badge critical">{data.risks.filter(r => r.level === 'critical').length}</span>
                  <span className="risk-badge high">{data.risks.filter(r => r.level === 'high').length}</span>
                  <span className="risk-badge medium">{data.risks.filter(r => r.level === 'medium').length}</span>
                </div>
              </div>
              <div className="section-body">
                {data.risks.length === 0 ? (
                  <div className="empty-state">
                    <CheckCircle size={48} style={{ color: '#22c55e', marginBottom: '1rem' }} />
                    <p>暂无风险预警</p>
                  </div>
                ) : (
                  <div className="risk-list">
                    {data.risks.map(risk => (
                      <div key={risk.id} className={`risk-item ${risk.level}`}>
                        <div className="risk-header">
                          <span className="risk-title">{risk.title}</span>
                          <span className={`risk-badge ${risk.level}`}>{risk.level}</span>
                        </div>
                        <p className="risk-description">{risk.description}</p>
                        <div className="risk-advice">
                          <div className="risk-advice-label">可操作建议</div>
                          <ul className="risk-advice-list">
                            {risk.actionableAdvice.map((advice, i) => (
                              <li key={i}>{advice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {data.expiringLicenses.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <div className="section-title">
                    <Calendar size={20} style={{ color: '#f97316' }} />
                    即将到期的授权
                  </div>
                </div>
                <div className="section-body">
                  <div className="expiring-list">
                    {data.expiringLicenses.map(item => (
                      <div
                        key={item.id}
                        className={`expiring-item ${item.daysLeft <= 15 ? 'urgent' : item.daysLeft <= 30 ? 'warning' : ''}`}
                      >
                        <div>
                          <div className="expiring-pack">{item.samplePackName}</div>
                          <div className="expiring-license">{item.licenseName}</div>
                        </div>
                        <div className="expiring-date">到期日期: {item.validUntil}</div>
                        <div className={`expiring-days ${item.daysLeft <= 15 ? 'urgent' : item.daysLeft <= 30 ? 'warning' : ''}`}>
                          {item.daysLeft < 0 ? `已过期 ${Math.abs(item.daysLeft)} 天` : `剩余 ${item.daysLeft} 天`}
                        </div>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => handleUpdateLicense(item.id)}>
                          续期
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {data.nameConflicts.length > 0 && (
              <div className="section">
                <div className="section-header">
                  <div className="section-title">
                    <AlertCircle size={20} style={{ color: '#eab308' }} />
                    同名采样包检测
                  </div>
                </div>
                <div className="section-body">
                  {data.nameConflicts.map((conflict, i) => (
                    <div key={i} className="conflict-item">
                      <div className="conflict-name">「{conflict.sampleName}」 - 涉及 {conflict.packIds.length} 个采样包</div>
                      <div className="conflict-recommendation">{conflict.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'licenses' && (
          <div className="section">
            <div className="section-header">
              <div className="section-title">
                <BarChart3 size={20} style={{ color: '#a855f7' }} />
                授权协议列表
              </div>
            </div>
            <div className="section-body">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>采样包</th>
                    <th>授权名称</th>
                    <th>类型</th>
                    <th>生效日期</th>
                    <th>到期日期</th>
                    <th>需要署名</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map(lic => {
                    const pack = packs.find(p => p.id === lic.samplePackId)
                    const isExpired = lic.validUntil && new Date(lic.validUntil) < new Date()
                    const isExpiringSoon = lic.validUntil && new Date(lic.validUntil) > new Date() && 
                      new Date(lic.validUntil) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    return (
                      <tr key={lic.id}>
                        <td>{pack?.name || '未知'}</td>
                        <td>{lic.licenseName}</td>
                        <td>{LICENSE_TYPE_LABELS[lic.licenseType] || lic.licenseType}</td>
                        <td>{lic.validFrom}</td>
                        <td>{lic.isPerpetual ? '永久' : lic.validUntil}</td>
                        <td>{lic.attributionRequired ? '是' : '否'}</td>
                        <td>
                          {lic.isPerpetual ? (
                            <span className="risk-badge low">永久有效</span>
                          ) : isExpired ? (
                            <span className="risk-badge critical">已过期</span>
                          ) : isExpiringSoon ? (
                            <span className="risk-badge high">即将过期</span>
                          ) : (
                            <span className="risk-badge low">有效</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'packs' && (
          <div className="section">
            <div className="section-header">
              <div className="section-title">
                <Package size={20} style={{ color: '#3b82f6' }} />
                采样包列表
              </div>
            </div>
            <div className="section-body">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>供应商</th>
                    <th>购买日期</th>
                    <th>价格</th>
                    <th>文件数量</th>
                    <th>标签</th>
                  </tr>
                </thead>
                <tbody>
                  {packs.map(pack => (
                    <tr key={pack.id}>
                      <td>{pack.name}</td>
                      <td>{pack.vendor}</td>
                      <td>{pack.purchaseDate}</td>
                      <td>¥{pack.cost}</td>
                      <td>{pack.fileCount}</td>
                      <td>
                        {pack.tags.map((tag, i) => (
                          <span key={i} className="tag">{tag}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tracks' && (
          <div className="section">
            <div className="section-header">
              <div className="section-title">
                <Disc size={20} style={{ color: '#22c55e' }} />
                曲目项目
              </div>
            </div>
            <div className="section-body">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>曲目名称</th>
                    <th>艺术家</th>
                    <th>专辑</th>
                    <th>发行日期</th>
                    <th>状态</th>
                    <th>使用采样</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map(track => {
                    const trackUsages = usages.filter(u => u.trackProjectId === track.id)
                    return (
                      <tr key={track.id}>
                        <td>{track.name}</td>
                        <td>{track.artist}</td>
                        <td>{track.album || '-'}</td>
                        <td>{track.releaseDate || '-'}</td>
                        <td>
                          <span className={`risk-badge ${track.status === 'released' ? 'low' : track.status === 'in-progress' ? 'medium' : 'none'}`}>
                            {track.status === 'released' ? '已发行' : track.status === 'in-progress' ? '制作中' : track.status === 'draft' ? '草稿' : '已归档'}
                          </span>
                        </td>
                        <td>{trackUsages.length} 个</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="section">
            <div className="section-header">
              <div className="section-title">
                <Clock size={20} style={{ color: '#6366f1' }} />
                版本历史
                {selectedVersion && data.versionHistory.length > 1 && (
                  <button
                    className="btn btn-primary"
                    style={{ marginLeft: '1rem', padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => handleCompareVersions(data.versionHistory[data.versionHistory.length - 1].id, selectedVersion)}
                  >
                    与最新版本对比
                  </button>
                )}
              </div>
            </div>
            <div className="section-body">
              <div className="version-history">
                {data.versionHistory.map((version, i) => (
                  <div
                    key={version.id}
                    className={`version-item ${selectedVersion === version.id ? 'selected' : ''}`}
                    onClick={() => setSelectedVersion(version.id)}
                  >
                    <div className="version-timestamp">
                      {new Date(version.timestamp).toLocaleString('zh-CN')}
                    </div>
                    <div className="version-info">
                      <div className="version-desc">{version.description}</div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span>采样包: {version.entitiesCount.samplePacks}</span>
                        <span>授权: {version.entitiesCount.licenses}</span>
                        <span>曲目: {version.entitiesCount.tracks}</span>
                        <span style={{ color: COLORS.critical }}>严重风险: {version.riskSummary.critical}</span>
                        <span style={{ color: COLORS.high }}>高风险: {version.riskSummary.high}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showDiffModal && diffData && (
        <div className="modal-overlay" onClick={() => setShowDiffModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">版本对比结果</div>
              <button className="modal-close" onClick={() => setShowDiffModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {diffData.modified.length > 0 && (
                <>
                  <h4 style={{ marginBottom: '1rem' }}>变更的项目</h4>
                  {diffData.modified.map((item: any, i: number) => (
                    <div key={i} className="diff-item">
                      <div className="diff-field">{item.entityName} ({item.entityType})</div>
                      {item.changes.map((change: any, j: number) => (
                        <div key={j} className="diff-values">
                          <span>{change.field}:</span>
                          <span className="diff-old">{JSON.stringify(change.oldValue)}</span>
                          <span>→</span>
                          <span className="diff-new">{JSON.stringify(change.newValue)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}

              {diffData.riskChanges.added.length > 0 && (
                <>
                  <h4 style={{ margin: '1.5rem 0 1rem', color: COLORS.critical }}>新增风险 ({diffData.riskChanges.added.length})</h4>
                  {diffData.riskChanges.added.map((risk: RiskAlert, i: number) => (
                    <div key={i} className="diff-item">
                      <div style={{ color: COLORS.critical, fontWeight: 500 }}>{risk.title}</div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>{risk.description}</div>
                    </div>
                  ))}
                </>
              )}

              {diffData.riskChanges.removed.length > 0 && (
                <>
                  <h4 style={{ margin: '1.5rem 0 1rem', color: COLORS.low }}>已解决风险 ({diffData.riskChanges.removed.length})</h4>
                  {diffData.riskChanges.removed.map((risk: RiskAlert, i: number) => (
                    <div key={i} className="diff-item">
                      <div style={{ color: COLORS.low, fontWeight: 500 }}>{risk.title}</div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>{risk.description}</div>
                    </div>
                  ))}
                </>
              )}

              {diffData.modified.length === 0 && diffData.riskChanges.added.length === 0 && diffData.riskChanges.removed.length === 0 && (
                <div className="empty-state">
                  <CheckCircle size={48} style={{ color: COLORS.low, marginBottom: '1rem' }} />
                  <p>两个版本无差异</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
