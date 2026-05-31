import { useCallback, useEffect, useState } from 'react'
import { Plus, RotateCcw, Search } from 'lucide-react'
import { api } from '@/api'
import { useFilterStore } from '@/stores/filterStore'
import type { MemberAccount, PetProfile } from '@/types'
import MemberDetail from '@/components/MemberDetail'

type Tab = 'members' | 'pets'

export default function Accounts() {
  const { searchQuery, memberStatus, setSearchQuery, setMemberStatus, resetFilters } = useFilterStore()
  const [tab, setTab] = useState<Tab>('members')
  const [members, setMembers] = useState<MemberAccount[]>([])
  const [pets, setPets] = useState<PetProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null)

  const [showCreateMember, setShowCreateMember] = useState(false)
  const [showCreatePet, setShowCreatePet] = useState(false)
  const [showOwnershipModal, setShowOwnershipModal] = useState<PetProfile | null>(null)

  const [memberForm, setMemberForm] = useState({ name: '', phone: '', balance: 0 })
  const [petForm, setPetForm] = useState({ name: '', species: '狗', breed: '', current_owner_id: '' })
  const [ownershipForm, setOwnershipForm] = useState({ newOwnerId: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (searchQuery) filters.keyword = searchQuery
      if (memberStatus) filters.status = memberStatus
      const list = await api.members.list(filters)
      setMembers(list)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, memberStatus])

  const loadPets = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (searchQuery) filters.keyword = searchQuery
      const list = await api.pets.list(filters)
      setPets(list)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    if (tab === 'members') loadMembers()
    else loadPets()
  }, [tab, loadMembers, loadPets])

  const handleCreateMember = async () => {
    setSubmitting(true)
    try {
      await api.members.create(memberForm)
      showMessage('success', '会员创建成功')
      setShowCreateMember(false)
      setMemberForm({ name: '', phone: '', balance: 0 })
      loadMembers()
    } catch {
      showMessage('error', '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreatePet = async () => {
    setSubmitting(true)
    try {
      await api.pets.create(petForm)
      showMessage('success', '宠物创建成功')
      setShowCreatePet(false)
      setPetForm({ name: '', species: '狗', breed: '', current_owner_id: '' })
      loadPets()
    } catch {
      showMessage('error', '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOwnershipChange = async () => {
    if (!showOwnershipModal) return
    setSubmitting(true)
    try {
      await api.pets.ownershipChange(showOwnershipModal.id, ownershipForm)
      showMessage('success', '主人变更申请已提交')
      setShowOwnershipModal(null)
      setOwnershipForm({ newOwnerId: '', reason: '' })
      loadPets()
    } catch {
      showMessage('error', '变更失败')
    } finally {
      setSubmitting(false)
    }
  }

  const memberStatusBadge = (status: string) => {
    if (status === 'active') return <span className="badge-success">正常</span>
    if (status === 'frozen') return <span className="badge-warning">冻结</span>
    if (status === 'closed') return <span className="badge-danger">已关闭</span>
    return <span className="badge-normal">{status}</span>
  }

  const speciesBadge = (species: string) => {
    if (species === '狗') return <span className="badge-info">狗</span>
    if (species === '猫') return <span className="badge-warning">猫</span>
    return <span className="badge-normal">{species}</span>
  }

  const resetAll = () => {
    resetFilters()
    setTab('members')
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">会员账户与宠物档案</h1>
      </div>

      <div className="filter-bar">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索姓名/手机号"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input pl-9"
          />
        </div>
        <select value={memberStatus} onChange={(e) => setMemberStatus(e.target.value)} className="filter-select">
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="frozen">冻结</option>
          <option value="closed">已关闭</option>
        </select>
        <button onClick={resetAll} className="btn-secondary btn-sm flex items-center gap-1">
          <RotateCcw size={14} />
          重置
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 mb-0">
        {(['members', 'pets'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'members' ? '会员账户' : '宠物档案'}
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'members' && (
          <button onClick={() => setShowCreateMember(true)} className="btn-primary btn-sm flex items-center gap-1 mb-1">
            <Plus size={14} />
            新建会员
          </button>
        )}
        {tab === 'pets' && (
          <button onClick={() => setShowCreatePet(true)} className="btn-primary btn-sm flex items-center gap-1 mb-1">
            <Plus size={14} />
            新建宠物
          </button>
        )}
      </div>

      {tab === 'members' && (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-4 py-3 font-medium text-slate-500">会员名称</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">手机号</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">预存余额</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">账户状态</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">创建时间</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">加载中...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">暂无数据</td></tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 table-row-hover">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.phone}</td>
                    <td className="px-4 py-3 text-teal-700 font-semibold">¥{m.balance.toFixed(2)}</td>
                    <td className="px-4 py-3">{memberStatusBadge(m.status)}</td>
                    <td className="px-4 py-3 text-slate-500">{m.created_at}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailMemberId(m.id)} className="btn-secondary btn-sm">
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pets' && (
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-4 py-3 font-medium text-slate-500">宠物名称</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">物种</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">品种</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">当前主人</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">创建时间</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">加载中...</td></tr>
              ) : pets.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">暂无数据</td></tr>
              ) : (
                pets.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 table-row-hover">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3">{speciesBadge(p.species)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.breed}</td>
                    <td className="px-4 py-3 text-slate-600">{p.owner_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.created_at}</td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button onClick={() => setShowOwnershipModal(p)} className="btn-secondary btn-sm">
                        换主人
                      </button>
                      <button onClick={() => setDetailMemberId(p.current_owner_id)} className="btn-secondary btn-sm">
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <MemberDetail memberId={detailMemberId} onClose={() => setDetailMemberId(null)} />

      {showCreateMember && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" onClick={() => setShowCreateMember(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800 mb-4">新建会员</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">姓名</label>
                <input type="text" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">手机号</label>
                <input type="text" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">初始余额</label>
                <input type="number" value={memberForm.balance} onChange={(e) => setMemberForm({ ...memberForm, balance: Number(e.target.value) })} className="filter-input w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreateMember(false)} className="btn-secondary">取消</button>
              <button onClick={handleCreateMember} disabled={submitting} className="btn-primary">
                {submitting ? '提交中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreatePet && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" onClick={() => setShowCreatePet(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800 mb-4">新建宠物</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">宠物名称</label>
                <input type="text" value={petForm.name} onChange={(e) => setPetForm({ ...petForm, name: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">物种</label>
                <select value={petForm.species} onChange={(e) => setPetForm({ ...petForm, species: e.target.value })} className="filter-select w-full">
                  <option value="狗">狗</option>
                  <option value="猫">猫</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">品种</label>
                <input type="text" value={petForm.breed} onChange={(e) => setPetForm({ ...petForm, breed: e.target.value })} className="filter-input w-full" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">所属会员</label>
                <select value={petForm.current_owner_id} onChange={(e) => setPetForm({ ...petForm, current_owner_id: e.target.value })} className="filter-select w-full">
                  <option value="">请选择</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowCreatePet(false)} className="btn-secondary">取消</button>
              <button onClick={handleCreatePet} disabled={submitting} className="btn-primary">
                {submitting ? '提交中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOwnershipModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center" onClick={() => setShowOwnershipModal(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-800 mb-1">变更主人</h3>
            <p className="text-sm text-slate-500 mb-4">宠物: {showOwnershipModal.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">选择新主人</label>
                <select value={ownershipForm.newOwnerId} onChange={(e) => setOwnershipForm({ ...ownershipForm, newOwnerId: e.target.value })} className="filter-select w-full">
                  <option value="">请选择</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">变更原因</label>
                <textarea
                  value={ownershipForm.reason}
                  onChange={(e) => setOwnershipForm({ ...ownershipForm, reason: e.target.value })}
                  className="filter-input w-full h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowOwnershipModal(null)} className="btn-secondary">取消</button>
              <button onClick={handleOwnershipChange} disabled={submitting} className="btn-primary">
                {submitting ? '提交中...' : '提交变更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
