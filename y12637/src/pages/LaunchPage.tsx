import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { createSampleProfile, RECENT_PROJECTS } from '../data/sampleData'
import type { StratumProfile, Layer, Boundary } from '../types'
import { generateId, STRATUM_COLORS, UNIT_LABELS } from '../types'

export default function LaunchPage() {
  const navigate = useNavigate()
  const { loadProfile, state } = useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLoadSample = () => {
    const profile = createSampleProfile()
    loadProfile(profile)
    navigate('/editor')
  }

  const handleCreateEmpty = () => {
    const profile: StratumProfile = {
      id: generateId('profile'),
      name: `新建岩层剖面_${new Date().toLocaleDateString('zh-CN')}`,
      layers: [],
      boundaries: [],
      anomalies: [],
      metadata: {
        operator: state.settings.operatorName,
        source: '手动新建',
        remarks: ''
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    loadProfile(profile)
    navigate('/editor')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string
        const data = JSON.parse(text)
        if (!data.layers || !data.name) {
          alert('文件格式不正确：缺少必要字段 layers 或 name')
          return
        }
        const profile: StratumProfile = {
          id: data.id || generateId('profile'),
          name: data.name,
          layers: (data.layers || []).map((l: any, idx: number) => ({
            id: l.id || generateId('layer'),
            name: l.name || `岩层${idx + 1}`,
            color: l.color || STRATUM_COLORS[idx % STRATUM_COLORS.length],
            depth: {
              top: Number(l.depth?.top ?? idx * 5),
              bottom: Number(l.depth?.bottom ?? (idx + 1) * 5)
            },
            thickness: Math.abs(Number(l.depth?.bottom ?? 0) - Number(l.depth?.top ?? 0)),
            unit: l.unit || 'unknown',
            annotations: l.annotations || [],
            remarks: l.remarks || '',
            source: l.source || '导入'
          })) as Layer[],
          boundaries: (data.boundaries || []).map((b: any) => ({
            id: b.id || generateId('bnd'),
            type: b.type || 'layer',
            startPoint: b.startPoint || { x: 0, y: 0 },
            endPoint: b.endPoint || { x: 500, y: 0 },
            status: b.status || 'normal',
            relatedLayerId: b.relatedLayerId,
            color: b.color || '#636E72'
          })) as Boundary[],
          anomalies: data.anomalies || [],
          metadata: data.metadata || { source: '导入文件', operator: state.settings.operatorName },
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          updatedAt: new Date()
        }
        loadProfile(profile)
        navigate('/editor')
      } catch (err) {
        console.error(err)
        alert('文件解析失败，请确认是有效的JSON文件')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-stratum-dark text-white rounded-xl text-2xl font-bold mb-4">
          岩
        </div>
        <h1 className="text-3xl font-bold text-stratum-dark mb-2">岩层剖面填色工具</h1>
        <p className="text-stratum-mid max-w-xl mx-auto">
          面向地质勘探与安全培训场景的专业辅助工具，支持岩层填色、边界检测、异常追踪与复盘报告导出
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div
          onClick={handleLoadSample}
          className="cursor-pointer bg-white border-2 border-dashed border-gray-300 hover:border-stratum-alert rounded-xl p-6 transition-all hover:shadow-lg group"
        >
          <div className="w-12 h-12 bg-orange-100 text-stratum-alert rounded-lg flex items-center justify-center mb-4 group-hover:bg-stratum-alert group-hover:text-white transition-colors text-xl">
            📋
          </div>
          <h3 className="font-bold text-stratum-dark mb-2">加载培训样例</h3>
          <p className="text-sm text-stratum-mid">
            打开一套包含常见问题的考核数据（旧表补录场景），含边界失败、单位混用、漏填单位等典型异常
          </p>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer bg-white border-2 border-dashed border-gray-300 hover:border-stratum-alert rounded-xl p-6 transition-all hover:shadow-lg group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors text-xl">
            📂
          </div>
          <h3 className="font-bold text-stratum-dark mb-2">导入数据文件</h3>
          <p className="text-sm text-stratum-mid">
            支持JSON、CSV格式。可导入已有勘测记录继续编辑
          </p>
        </div>

        <div
          onClick={handleCreateEmpty}
          className="cursor-pointer bg-white border-2 border-dashed border-gray-300 hover:border-stratum-alert rounded-xl p-6 transition-all hover:shadow-lg group"
        >
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors text-xl">
            ➕
          </div>
          <h3 className="font-bold text-stratum-dark mb-2">新建空白剖面</h3>
          <p className="text-sm text-stratum-mid">
            从零开始创建一个新的岩层剖面，手动添加岩层和边界
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-bold text-stratum-dark mb-4 flex items-center gap-2">
          <span>🕒</span> 最近项目
        </h2>
        <div className="divide-y divide-gray-100">
          {RECENT_PROJECTS.map(p => (
            <div
              key={p.id}
              onClick={handleLoadSample}
              className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-stratum-dark">{p.name}</div>
                <div className="text-xs text-stratum-mid mt-0.5">
                  更新于 {p.updatedAt.toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded ${
                  p.status === '已完成' ? 'bg-green-100 text-green-700' :
                  p.status === '处理中' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {p.status}
                </span>
                <span className="text-xs text-stratum-mid">{p.anomalyCount} 处异常</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-stratum-mid">
        <p>提示：本工具说明文档位于顶栏「说明」页面，包含启动、导入、异常查看、导出结果等操作步骤</p>
      </div>
    </div>
  )
}
