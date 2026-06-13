import { useState, useEffect } from 'react'
import './App.css'
import ReportHeader from './components/ReportHeader'
import SampleList from './components/SampleList'
import SampleDetail from './components/SampleDetail'
import ControlPanel from './components/ControlPanel'
import AnomalyPanel from './components/AnomalyPanel'
import FormulaPanel from './components/FormulaPanel'
import ExportPanel from './components/ExportPanel'

function App() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSampleId, setSelectedSampleId] = useState(null)
  const [params, setParams] = useState({ windSpeed: 30, attackAngle: 5 })
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [activeTab, setActiveTab] = useState('detail')

  useEffect(() => {
    fetchReport()
  }, [])

  useEffect(() => {
    if (report && report.samples && report.samples.length > 0 && !selectedSampleId) {
      setSelectedSampleId(report.samples[0].id)
    }
  }, [report, selectedSampleId])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/reports/WT-2024-001')
      const data = await res.json()
      if (data.success) {
        setReport(data.data)
        setParams({
          windSpeed: data.data.parameters.windSpeed.value,
          attackAngle: data.data.parameters.attackAngle.value
        })
      }
    } catch (error) {
      console.error('加载报告失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true)
      const res = await fetch('/api/reports/WT-2024-001/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      const data = await res.json()
      if (data.success) {
        setReport(prev => ({
          ...prev,
          ...data.data,
          samples: data.data.samples
        }))
      }
    } catch (error) {
      console.error('复算失败:', error)
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleExport = async (format = 'html') => {
    try {
      const res = await fetch(`/api/reports/WT-2024-001/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `风洞烟线报告-${report.id}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('导出失败:', error)
    }
  }

  const selectedSample = report?.samples?.find(s => s.id === selectedSampleId)

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>正在加载风洞烟线报告...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <ReportHeader report={report} onExport={handleExport} />
      
      <div className="main-content">
        <div className="left-panel">
          <div className="panel-section">
            <h3>样本列表</h3>
            <SampleList 
              samples={report?.samples || []} 
              selectedId={selectedSampleId}
              onSelect={setSelectedSampleId}
            />
          </div>
          
          <div className="panel-section">
            <h3>异常与问题</h3>
            <AnomalyPanel anomalies={report?.anomalies || []} />
          </div>
        </div>

        <div className="center-panel">
          {selectedSample ? (
            <SampleDetail 
              sample={selectedSample} 
              report={report}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          ) : (
            <div className="empty-state">
              <p>请从左侧选择一个样本查看详情</p>
            </div>
          )}
        </div>

        <div className="right-panel">
          <div className="panel-section">
            <h3>参数调整</h3>
            <ControlPanel 
              params={params}
              onChange={setParams}
              onRecalculate={handleRecalculate}
              isRecalculating={isRecalculating}
              parameterChange={report?.parameterChange}
            />
          </div>

          <div className="panel-section">
            <h3>计算公式</h3>
            <FormulaPanel formulas={report?.formulas || []} />
          </div>

          <div className="panel-section">
            <h3>材料与结论</h3>
            <div className="material-card">
              <p><strong>材料：</strong>{report?.materialInfo?.standardName}</p>
              {report?.materialInfo && !report.materialInfo.isNameConsistent && (
                <div className="material-note">
                  <span className="badge info">名称已统一</span>
                  <p className="small">原始记录："{report.materialInfo.originalName}" → 标准名称</p>
                </div>
              )}
              <p className="conclusion-text">{report?.materialConclusion?.conclusion}</p>
            </div>
          </div>

          <div className="panel-section">
            <h3>导出报告</h3>
            <ExportPanel onExport={handleExport} />
          </div>

          <div className="panel-section usage-guide">
            <h3>使用说明</h3>
            <ol>
              <li><strong>放样例：</strong>左侧列表任选样本查看结果</li>
              <li><strong>重跑：</strong>调整参数后点"重新计算"复算分离点</li>
              <li><strong>看截图说明：</strong>中间面板截图下方有说明</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
