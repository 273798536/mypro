import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Ticket, ShoppingBag, FileSpreadsheet, AlertTriangle, CheckCircle, Search } from 'lucide-react'
import { StatusTag, ExceptionTypeTag } from '@/components/ui/StatusTag'

export function Trace() {
  const [searchType, setSearchType] = useState<'order' | 'result'>('order')
  const [searchId, setSearchId] = useState('')
  const navigate = useNavigate()

  const handleSearch = () => {
    if (!searchId) return
    if (searchType === 'order') {
      navigate(`/trace/forward/${searchId}`)
    } else {
      navigate(`/trace/backward/${searchId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">追溯查询</h1>
        <p className="text-slate-500 mt-1">从订单追溯分账结果，或从结果反查衍生品销售</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setSearchType('order')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                searchType === 'order'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              正向追溯（订单→结果）
            </button>
            <button
              onClick={() => setSearchType('result')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                searchType === 'result'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              反向追溯（结果→衍生品）
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder={searchType === 'order' ? '请输入订单ID' : '请输入分账结果ID'}
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Search size={18} />
            查询
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">快速查询示例</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
            <p className="text-sm text-slate-500 mb-1">正向追溯示例</p>
            <p className="font-mono text-sm text-slate-700">点击列表中的"追溯"按钮</p>
            <Link to="/orders" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
              前往订单列表 →
            </Link>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
            <p className="text-sm text-slate-500 mb-1">反向追溯示例</p>
            <p className="font-mono text-sm text-slate-700">从收入归集选择分账结果</p>
            <Link to="/revenue" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
              前往收入归集 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TraceForward() {
  const { orderId } = useParams<{ orderId: string }>()
  const { traceForward, loading } = useStore()
  const [traceData, setTraceData] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      traceForward(orderId).then(setTraceData)
    }
  }, [orderId, traceForward])

  if (loading || !traceData) {
    return <div className="p-8 text-center">加载中...</div>
  }

  const { order, splitResult, rule, exceptions, derivatives } = traceData

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/trace" className="text-slate-500 hover:text-slate-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">正向追溯</h1>
          <p className="text-slate-500 mt-1">订单 → 分账结果全链路追踪</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />
        
        <TimelineNode
          icon={<Ticket className="text-indigo-600" size={24} />}
          title="票务订单"
          active={true}
        >
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500">订单号</p>
                <p className="font-medium font-mono">{order?.orderNo}</p>
              </div>
              <div>
                <p className="text-slate-500">展览</p>
                <p className="font-medium">{order?.exhibitionName}</p>
              </div>
              <div>
                <p className="text-slate-500">金额</p>
                <p className="font-medium">¥{order?.totalAmount?.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-3">
              <StatusTag status={order?.status || 'PENDING'} />
            </div>
          </div>
        </TimelineNode>

        {derivatives?.length > 0 && (
          <TimelineNode
            icon={<ShoppingBag className="text-emerald-600" size={24} />}
            title="衍生品销售"
            active={true}
          >
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              {derivatives.map((d: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium">{d.productName}</p>
                    <p className="text-sm text-slate-500">数量: {d.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">¥{d.totalAmount.toFixed(2)}</p>
                    {d.isSupplementary && (
                      <span className="text-xs text-amber-600">后补录入</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TimelineNode>
        )}

        {exceptions?.length > 0 && (
          <TimelineNode
            icon={<AlertTriangle className="text-amber-600" size={24} />}
            title="异常处理"
            active={true}
          >
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              {exceptions.map((e: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <ExceptionTypeTag type={e.type} />
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-slate-500">{e.description}</p>
                  </div>
                  <StatusTag status={e.status} />
                </div>
              ))}
            </div>
          </TimelineNode>
        )}

        <TimelineNode
          icon={<FileSpreadsheet className="text-indigo-600" size={24} />}
          title="分账规则"
          active={!!rule}
        >
          {rule ? (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="font-medium">{rule.ruleName}</p>
              <p className="text-sm text-slate-500 mt-1">
                当前版本: v{rule.currentVersion}
              </p>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">未匹配到分账规则</div>
          )}
        </TimelineNode>

        <TimelineNode
          icon={<CheckCircle className="text-emerald-600" size={24} />}
          title="分账结果"
          active={!!splitResult}
          last={true}
        >
          {splitResult ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="space-y-2">
                {splitResult.splitDetails?.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{d.stepName} - {d.recipient}</span>
                    <span className="font-medium">¥{d.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-emerald-200 font-medium">
                  <span>合计</span>
                  <span>¥{splitResult.finalAmount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">尚未生成分账结果</div>
          )}
        </TimelineNode>
      </div>
    </div>
  )
}

function TimelineNode({ icon, title, active, children, last = false }: {
  icon: React.ReactNode
  title: string
  active: boolean
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className="relative pl-20 pb-8">
      <div className={`absolute left-6 w-6 h-6 rounded-full flex items-center justify-center ${
        active ? 'bg-white border-2 border-indigo-400' : 'bg-slate-100 border border-slate-200'
      }`}>
        {icon}
      </div>
      <div className="mb-2">
        <h3 className={`font-semibold ${active ? 'text-slate-900' : 'text-slate-400'}`}>{title}</h3>
      </div>
      {children}
    </div>
  )
}
