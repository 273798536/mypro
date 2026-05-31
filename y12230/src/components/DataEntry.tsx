import { useState } from 'react'
import { useStore } from '@/store'
import type { DataSourceTab, ProjectLedger, TimeRecord, MaterialRequisition, InvoiceVoucher } from '@/types'

const TABS: { key: DataSourceTab; label: string }[] = [
  { key: 'project', label: '项目台账' },
  { key: 'timeRecord', label: '工时记录' },
  { key: 'material', label: '材料领用' },
  { key: 'invoice', label: '发票凭证' },
]

const emptyProject: { name: string; code: string; startDate: string; endDate: string; budget: number; status: 'active' | 'closed'; source: string } = { name: '', code: '', startDate: '', endDate: '', budget: 0, status: 'active', source: '手工录入' }
const emptyTimeRecord = { projectId: '', employeeName: '', hours: 0, hourlyRate: 0, date: '', isRetroactive: false, retroactiveReason: '', source: '手工录入' }
const emptyMaterial = { projectId: '', materialName: '', quantity: 0, unitPrice: 0, requisitionDate: '', source: '手工录入' }
const emptyInvoice = { projectId: '', invoiceNumber: '', amount: 0, category: '', invoiceDate: '', isMissing: false, missingReason: '', source: '手工录入' }

export default function DataEntry() {
  const [activeTab, setActiveTab] = useState<DataSourceTab>('project')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState<typeof emptyProject>(emptyProject)
  const [timeForm, setTimeForm] = useState(emptyTimeRecord)
  const [materialForm, setMaterialForm] = useState(emptyMaterial)
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice)

  const { projects, timeRecords, materials, invoices, addProject, updateProject, deleteProject, addTimeRecord, updateTimeRecord, deleteTimeRecord, addMaterial, updateMaterial, deleteMaterial, addInvoice, updateInvoice, deleteInvoice } = useStore()

  const resetForm = () => {
    setEditingId(null)
    setProjectForm(emptyProject)
    setTimeForm(emptyTimeRecord)
    setMaterialForm(emptyMaterial)
    setInvoiceForm(emptyInvoice)
  }

  const handleProjectSubmit = () => {
    if (!projectForm.name || !projectForm.code) return
    if (editingId) {
      updateProject(editingId, projectForm)
    } else {
      addProject(projectForm)
    }
    resetForm()
  }

  const handleTimeSubmit = () => {
    if (!timeForm.projectId || !timeForm.employeeName) return
    if (editingId) {
      updateTimeRecord(editingId, timeForm)
    } else {
      addTimeRecord(timeForm)
    }
    resetForm()
  }

  const handleMaterialSubmit = () => {
    if (!materialForm.projectId || !materialForm.materialName) return
    if (editingId) {
      updateMaterial(editingId, materialForm)
    } else {
      addMaterial(materialForm)
    }
    resetForm()
  }

  const handleInvoiceSubmit = () => {
    if (!invoiceForm.projectId || !invoiceForm.category) return
    if (editingId) {
      updateInvoice(editingId, invoiceForm)
    } else {
      addInvoice(invoiceForm)
    }
    resetForm()
  }

  const handleEditProject = (p: ProjectLedger) => {
    setEditingId(p.id)
    setProjectForm({ name: p.name, code: p.code, startDate: p.startDate, endDate: p.endDate, budget: p.budget, status: p.status, source: p.source })
  }

  const handleEditTime = (t: TimeRecord) => {
    setEditingId(t.id)
    setTimeForm({ projectId: t.projectId, employeeName: t.employeeName, hours: t.hours, hourlyRate: t.hourlyRate, date: t.date, isRetroactive: t.isRetroactive, retroactiveReason: t.retroactiveReason, source: t.source })
  }

  const handleEditMaterial = (m: MaterialRequisition) => {
    setEditingId(m.id)
    setMaterialForm({ projectId: m.projectId, materialName: m.materialName, quantity: m.quantity, unitPrice: m.unitPrice, requisitionDate: m.requisitionDate, source: m.source })
  }

  const handleEditInvoice = (i: InvoiceVoucher) => {
    setEditingId(i.id)
    setInvoiceForm({ projectId: i.projectId, invoiceNumber: i.invoiceNumber, amount: i.amount, category: i.category, invoiceDate: i.invoiceDate, isMissing: i.isMissing, missingReason: i.missingReason, source: i.source })
  }

  const inputCls = 'border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-[#d4a853]'
  const btnCls = 'px-3 py-1 rounded text-sm text-white bg-[#d4a853] hover:bg-[#c49a48] disabled:opacity-50'
  const delBtnCls = 'px-2 py-1 rounded text-sm text-red-600 hover:bg-red-50'

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); resetForm() }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'text-[#d4a853] border-b-2 border-[#d4a853]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'project' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <input placeholder="项目名称" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} className={inputCls} />
              <input placeholder="项目编号" value={projectForm.code} onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })} className={inputCls} />
              <input type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} className={inputCls} />
              <input type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} className={inputCls} />
              <input type="number" placeholder="预算" value={projectForm.budget || ''} onChange={(e) => setProjectForm({ ...projectForm, budget: Number(e.target.value) })} className={inputCls} />
              <select value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as 'active' | 'closed' })} className={inputCls}>
                <option value="active">进行中</option>
                <option value="closed">已结项</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleProjectSubmit} className={btnCls}>{editingId ? '更新' : '添加'}</button>
              {editingId && <button onClick={resetForm} className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-200">取消</button>}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50"><th className="px-3 py-2 text-left">名称</th><th className="px-3 py-2 text-left">编号</th><th className="px-3 py-2 text-left">开始日期</th><th className="px-3 py-2 text-left">结束日期</th><th className="px-3 py-2 text-right">预算</th><th className="px-3 py-2 text-center">状态</th><th className="px-3 py-2 text-center">版本</th><th className="px-3 py-2 text-center">来源</th><th className="px-3 py-2 text-center">操作</th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.code}</td>
                  <td className="px-3 py-2">{p.startDate}</td>
                  <td className="px-3 py-2">{p.endDate}</td>
                  <td className="px-3 py-2 text-right">{p.budget.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">{p.status === 'active' ? '进行中' : '已结项'}</td>
                  <td className="px-3 py-2 text-center">v{p.version}</td>
                  <td className="px-3 py-2 text-center">{p.source}</td>
                  <td className="px-3 py-2 text-center space-x-1">
                    <button onClick={() => handleEditProject(p)} className="text-[#d4a853] hover:underline">编辑</button>
                    <button onClick={() => { if (window.confirm('确认删除？')) deleteProject(p.id) }} className={delBtnCls}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'timeRecord' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <select value={timeForm.projectId} onChange={(e) => setTimeForm({ ...timeForm, projectId: e.target.value })} className={inputCls}>
                <option value="">选择项目</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="员工姓名" value={timeForm.employeeName} onChange={(e) => setTimeForm({ ...timeForm, employeeName: e.target.value })} className={inputCls} />
              <input type="number" placeholder="工时" value={timeForm.hours || ''} onChange={(e) => setTimeForm({ ...timeForm, hours: Number(e.target.value) })} className={inputCls} />
              <input type="number" placeholder="时薪" value={timeForm.hourlyRate || ''} onChange={(e) => setTimeForm({ ...timeForm, hourlyRate: Number(e.target.value) })} className={inputCls} />
              <input type="date" value={timeForm.date} onChange={(e) => setTimeForm({ ...timeForm, date: e.target.value })} className={inputCls} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={timeForm.isRetroactive} onChange={(e) => setTimeForm({ ...timeForm, isRetroactive: e.target.checked, retroactiveReason: e.target.checked ? timeForm.retroactiveReason : '' })} />补录</label>
            </div>
            {timeForm.isRetroactive && (
              <input placeholder="补录原因" value={timeForm.retroactiveReason} onChange={(e) => setTimeForm({ ...timeForm, retroactiveReason: e.target.value })} className={`${inputCls} w-full`} />
            )}
            <div className="flex gap-2">
              <button onClick={handleTimeSubmit} className={btnCls}>{editingId ? '更新' : '添加'}</button>
              {editingId && <button onClick={resetForm} className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-200">取消</button>}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50"><th className="px-3 py-2 text-left">项目</th><th className="px-3 py-2 text-left">员工</th><th className="px-3 py-2 text-right">工时</th><th className="px-3 py-2 text-right">时薪</th><th className="px-3 py-2 text-left">日期</th><th className="px-3 py-2 text-center">补录</th><th className="px-3 py-2 text-center">版本</th><th className="px-3 py-2 text-center">来源</th><th className="px-3 py-2 text-center">操作</th></tr></thead>
            <tbody>
              {timeRecords.map((t) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{projects.find((p) => p.id === t.projectId)?.name || '-'}</td>
                  <td className="px-3 py-2">{t.employeeName}</td>
                  <td className="px-3 py-2 text-right">{t.hours}</td>
                  <td className="px-3 py-2 text-right">{t.hourlyRate}</td>
                  <td className="px-3 py-2">{t.date}</td>
                  <td className="px-3 py-2 text-center">{t.isRetroactive ? `是(${t.retroactiveReason})` : '否'}</td>
                  <td className="px-3 py-2 text-center">v{t.version}</td>
                  <td className="px-3 py-2 text-center">{t.source}</td>
                  <td className="px-3 py-2 text-center space-x-1">
                    <button onClick={() => handleEditTime(t)} className="text-[#d4a853] hover:underline">编辑</button>
                    <button onClick={() => { if (window.confirm('确认删除？')) deleteTimeRecord(t.id) }} className={delBtnCls}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'material' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <select value={materialForm.projectId} onChange={(e) => setMaterialForm({ ...materialForm, projectId: e.target.value })} className={inputCls}>
                <option value="">选择项目</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="材料名称" value={materialForm.materialName} onChange={(e) => setMaterialForm({ ...materialForm, materialName: e.target.value })} className={inputCls} />
              <input type="number" placeholder="数量" value={materialForm.quantity || ''} onChange={(e) => setMaterialForm({ ...materialForm, quantity: Number(e.target.value) })} className={inputCls} />
              <input type="number" placeholder="单价" value={materialForm.unitPrice || ''} onChange={(e) => setMaterialForm({ ...materialForm, unitPrice: Number(e.target.value) })} className={inputCls} />
              <input type="date" value={materialForm.requisitionDate} onChange={(e) => setMaterialForm({ ...materialForm, requisitionDate: e.target.value })} className={inputCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleMaterialSubmit} className={btnCls}>{editingId ? '更新' : '添加'}</button>
              {editingId && <button onClick={resetForm} className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-200">取消</button>}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50"><th className="px-3 py-2 text-left">项目</th><th className="px-3 py-2 text-left">材料</th><th className="px-3 py-2 text-right">数量</th><th className="px-3 py-2 text-right">单价</th><th className="px-3 py-2 text-left">领用日期</th><th className="px-3 py-2 text-center">版本</th><th className="px-3 py-2 text-center">来源</th><th className="px-3 py-2 text-center">操作</th></tr></thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{projects.find((p) => p.id === m.projectId)?.name || '-'}</td>
                  <td className="px-3 py-2">{m.materialName}</td>
                  <td className="px-3 py-2 text-right">{m.quantity}</td>
                  <td className="px-3 py-2 text-right">{m.unitPrice}</td>
                  <td className="px-3 py-2">{m.requisitionDate}</td>
                  <td className="px-3 py-2 text-center">v{m.version}</td>
                  <td className="px-3 py-2 text-center">{m.source}</td>
                  <td className="px-3 py-2 text-center space-x-1">
                    <button onClick={() => handleEditMaterial(m)} className="text-[#d4a853] hover:underline">编辑</button>
                    <button onClick={() => { if (window.confirm('确认删除？')) deleteMaterial(m.id) }} className={delBtnCls}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invoice' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <select value={invoiceForm.projectId} onChange={(e) => setInvoiceForm({ ...invoiceForm, projectId: e.target.value })} className={inputCls}>
                <option value="">选择项目</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="发票号码" value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} className={inputCls} />
              <input type="number" placeholder="金额" value={invoiceForm.amount || ''} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} className={inputCls} />
              <input placeholder="费用类别" value={invoiceForm.category} onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })} className={inputCls} />
              <input type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} className={inputCls} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={invoiceForm.isMissing} onChange={(e) => setInvoiceForm({ ...invoiceForm, isMissing: e.target.checked, missingReason: e.target.checked ? invoiceForm.missingReason : '' })} />缺发票</label>
            </div>
            {invoiceForm.isMissing && (
              <input placeholder="缺票原因" value={invoiceForm.missingReason} onChange={(e) => setInvoiceForm({ ...invoiceForm, missingReason: e.target.value })} className={`${inputCls} w-full`} />
            )}
            <div className="flex gap-2">
              <button onClick={handleInvoiceSubmit} className={btnCls}>{editingId ? '更新' : '添加'}</button>
              {editingId && <button onClick={resetForm} className="px-3 py-1 rounded text-sm text-gray-600 hover:bg-gray-200">取消</button>}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-gray-50"><th className="px-3 py-2 text-left">项目</th><th className="px-3 py-2 text-left">发票号</th><th className="px-3 py-2 text-right">金额</th><th className="px-3 py-2 text-left">类别</th><th className="px-3 py-2 text-left">日期</th><th className="px-3 py-2 text-center">缺票</th><th className="px-3 py-2 text-center">版本</th><th className="px-3 py-2 text-center">来源</th><th className="px-3 py-2 text-center">操作</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2">{projects.find((p) => p.id === i.projectId)?.name || '-'}</td>
                  <td className="px-3 py-2">{i.invoiceNumber}</td>
                  <td className="px-3 py-2 text-right">{i.amount.toLocaleString()}</td>
                  <td className="px-3 py-2">{i.category}</td>
                  <td className="px-3 py-2">{i.invoiceDate}</td>
                  <td className="px-3 py-2 text-center">{i.isMissing ? `是(${i.missingReason})` : '否'}</td>
                  <td className="px-3 py-2 text-center">v{i.version}</td>
                  <td className="px-3 py-2 text-center">{i.source}</td>
                  <td className="px-3 py-2 text-center space-x-1">
                    <button onClick={() => handleEditInvoice(i)} className="text-[#d4a853] hover:underline">编辑</button>
                    <button onClick={() => { if (window.confirm('确认删除？')) deleteInvoice(i.id) }} className={delBtnCls}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
