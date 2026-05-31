import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '@/api'
import type { MemberAccount, PetProfile, Package, OwnershipChange } from '@/types'

interface MemberDetailProps {
  memberId: string | null
  onClose: () => void
}

export default function MemberDetail({ memberId, onClose }: MemberDetailProps) {
  const [member, setMember] = useState<(MemberAccount & { pets: PetProfile[]; packages: Package[] }) | null>(null)
  const [ownershipChanges, setOwnershipChanges] = useState<OwnershipChange[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!memberId) return
    setLoading(true)
    Promise.all([
      api.members.get(memberId),
      api.exceptions.list({ type: 'ownership_change', relatedMemberId: memberId }).catch(() => []),
    ])
      .then(([memberRes, exceptionsList]) => {
        setMember(memberRes.data)
        setOwnershipChanges(exceptionsList as any)
      })
      .finally(() => setLoading(false))
  }, [memberId])

  useEffect(() => {
    if (memberId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [memberId])

  if (!memberId) return null

  const statusBadge = (status: string) => {
    if (status === 'active') return <span className="badge-success">正常</span>
    if (status === 'frozen') return <span className="badge-warning">冻结</span>
    if (status === 'closed') return <span className="badge-danger">已关闭</span>
    return <span className="badge-normal">{status}</span>
  }

  const packageStatusBadge = (status: string) => {
    if (status === 'active') return <span className="badge-success">有效</span>
    if (status === 'expired') return <span className="badge-warning">已过期</span>
    if (status === 'exhausted') return <span className="badge-danger">已用完</span>
    return <span className="badge-normal">{status}</span>
  }

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">会员详情</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-slate-400">加载中...</div>
        ) : member ? (
          <div className="p-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">{member.name}</h4>
                {statusBadge(member.status)}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">手机号</span>
                  <p className="text-slate-700 mt-0.5">{member.phone}</p>
                </div>
                <div>
                  <span className="text-slate-400">预存余额</span>
                  <p className="text-teal-700 font-semibold mt-0.5">¥{member.balance.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">创建时间</span>
                  <p className="text-slate-700 mt-0.5">{member.created_at}</p>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-slate-700 mb-2">关联宠物</h5>
              {member.pets.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">暂无宠物</p>
              ) : (
                <div className="space-y-2">
                  {member.pets.map((pet) => (
                    <div key={pet.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                      <span className="text-slate-700 font-medium">{pet.name}</span>
                      <span className="text-slate-400">{pet.species} · {pet.breed}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h5 className="text-sm font-semibold text-slate-700 mb-2">套餐列表</h5>
              {member.packages.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">暂无套餐</p>
              ) : (
                <div className="space-y-2">
                  {member.packages.map((pkg) => (
                    <div key={pkg.id} className="px-3 py-2 bg-slate-50 rounded-lg text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">{pkg.name}</span>
                        {packageStatusBadge(pkg.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>剩余 {pkg.remaining_deductions}/{pkg.total_deductions} 次</span>
                        <span>到期 {pkg.expires_at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h5 className="text-sm font-semibold text-slate-700 mb-2">变更历史</h5>
              {ownershipChanges.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">暂无变更记录</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                  {ownershipChanges.map((oc) => (
                    <div key={oc.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />
                      <div className="text-sm text-slate-700">
                        <span className="font-medium">{oc.previous_owner_name || '未知'}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-medium">{oc.new_owner_name || '未知'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{oc.reason}</p>
                      <p className="text-xs text-slate-300 mt-0.5">{oc.created_at}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
