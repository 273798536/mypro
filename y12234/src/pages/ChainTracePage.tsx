import { useState } from 'react';
import { Link as LinkIcon, ArrowRight, FileText, Car, RefreshCw, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { useAppStore } from '../store';
import { ChainNode } from '../types';
import { Link } from 'react-router-dom';

export default function ChainTracePage() {
  const { revenues, getChainNodes, isDataLoaded, plates, flows, bindings, statusChanges } = useAppStore();
  const [selectedRevenueId, setSelectedRevenueId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ChainNode | null>(null);

  const chainNodes = selectedRevenueId ? getChainNodes(selectedRevenueId) : [];
  const selectedRevenue = revenues.find(r => r.id === selectedRevenueId);

  const getNodeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      archive: <Car className="w-5 h-5" />,
      flow: <Clock className="w-5 h-5" />,
      binding: <RefreshCw className="w-5 h-5" />,
      revenue: <DollarSign className="w-5 h-5" />,
      problem: <AlertTriangle className="w-5 h-5" />
    };
    return icons[type] || <FileText className="w-5 h-5" />;
  };

  const getNodeColor = (type: string, status: string) => {
    if (status === 'error') return 'bg-red-100 text-red-600 border-red-300';
    if (status === 'warning') return 'bg-amber-100 text-amber-600 border-amber-300';
    
    const colors: Record<string, string> = {
      archive: 'bg-blue-100 text-blue-600 border-blue-300',
      flow: 'bg-emerald-100 text-emerald-600 border-emerald-300',
      binding: 'bg-purple-100 text-purple-600 border-purple-300',
      revenue: 'bg-teal-100 text-teal-600 border-teal-300',
      problem: 'bg-red-100 text-red-600 border-red-300'
    };
    return colors[type] || 'bg-slate-100 text-slate-600 border-slate-300';
  };

  const getNodeLabel = (type: string) => {
    const labels: Record<string, string> = {
      archive: '车牌档案',
      flow: '临停流水',
      binding: '换绑记录',
      revenue: '收入递延',
      problem: '问题标记'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-3 rounded-xl">
            <LinkIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">链路追踪</h2>
            <p className="text-sm text-slate-500">从收入递延结果反向追踪完整数据链路</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">选择收入递延记录</label>
          {isDataLoaded && revenues.length > 0 ? (
            <select
              value={selectedRevenueId || ''}
              onChange={(e) => {
                setSelectedRevenueId(e.target.value || null);
                setSelectedNode(null);
              }}
              className="w-full max-w-md px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="">请选择...</option>
              {revenues.map((revenue) => (
                <option key={revenue.id} value={revenue.id}>
                  {revenue.plateNumber} - {revenue.period} (¥{revenue.totalAmount})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-slate-400 text-sm">
              <Link to="/import" className="text-emerald-600 hover:underline">请先导入数据</Link>
            </div>
          )}
        </div>
      </div>

      {selectedRevenueId && chainNodes.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">数据链路图</h3>
          
          <div className="flex flex-wrap items-start gap-4 pb-4 overflow-x-auto">
            {chainNodes.map((node, index) => (
              <div key={node.id} className="flex items-start">
                <div
                  onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${getNodeColor(node.type, node.status)} ${
                    selectedNode?.id === node.id ? 'ring-2 ring-offset-2 ring-emerald-500 scale-105' : 'hover:scale-105'
                  } ${node.status === 'error' ? 'animate-pulse' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getNodeIcon(node.type)}
                    <span className="text-xs font-medium uppercase opacity-75">{getNodeLabel(node.type)}</span>
                  </div>
                  <div className="font-semibold text-sm">{node.title}</div>
                  <div className="flex items-center gap-1 mt-2">
                    {node.status === 'normal' && <CheckCircle className="w-4 h-4" />}
                    {node.status === 'warning' && <AlertTriangle className="w-4 h-4" />}
                    {node.status === 'error' && <XCircle className="w-4 h-4" />}
                  </div>
                </div>
                {index < chainNodes.length - 1 && (
                  <div className="flex items-center h-20 px-2">
                    <ArrowRight className="w-6 h-6 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500 mt-4">
            💡 点击节点查看详细信息
          </p>
        </div>
      )}

      {selectedNode && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-xl ${getNodeColor(selectedNode.type, selectedNode.status)}`}>
              {getNodeIcon(selectedNode.type)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{getNodeLabel(selectedNode.type)} 详情</h3>
              <p className="text-sm text-slate-500">{selectedNode.title}</p>
            </div>
          </div>

          {selectedNode.type === 'revenue' && selectedNode.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">车牌号码</div>
                  <div className="font-semibold text-slate-800">{selectedNode.data.plateNumber}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">所属期间</div>
                  <div className="font-semibold text-slate-800">{selectedNode.data.period}</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="text-sm text-emerald-600 mb-1">已确认收入</div>
                  <div className="font-semibold text-emerald-700">¥{selectedNode.data.recognizedAmount}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm text-blue-600 mb-1">递延收入</div>
                  <div className="font-semibold text-blue-700">¥{selectedNode.data.deferredAmount}</div>
                </div>
              </div>
              
              {selectedNode.data.warnings?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    警告信息
                  </div>
                  <ul className="text-sm text-amber-600 space-y-1">
                    {selectedNode.data.warnings.map((w: string, i: number) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedNode.data.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <XCircle className="w-5 h-5" />
                    错误信息
                  </div>
                  <ul className="text-sm text-red-600 space-y-1">
                    {selectedNode.data.errors.map((e: string, i: number) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'archive' && selectedNode.data && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">车牌号码</div>
                <div className="font-semibold text-slate-800">{selectedNode.data.plateNumber}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">车主姓名</div>
                <div className="font-semibold text-slate-800">{selectedNode.data.ownerName}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">车辆类型</div>
                <div className="font-semibold text-slate-800">
                  {selectedNode.data.vehicleType === 'private' ? '私家车' : 
                   selectedNode.data.vehicleType === 'commercial' ? '营运车' : '临时车'}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">生效日期</div>
                <div className="font-semibold text-slate-800">{selectedNode.data.effectiveDate}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">失效日期</div>
                <div className="font-semibold text-slate-800">{selectedNode.data.expiryDate}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">月费金额</div>
                <div className="font-semibold text-slate-800">¥{selectedNode.data.monthlyFee}</div>
              </div>
            </div>
          )}

          {selectedNode.type === 'binding' && selectedNode.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">旧车牌</div>
                  <div className="font-semibold text-slate-800">{selectedNode.data.oldPlate}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">新车牌</div>
                  <div className="font-semibold text-slate-800">{selectedNode.data.newPlate}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">换绑时间</div>
                  <div className="font-semibold text-slate-800 text-sm">
                    {new Date(selectedNode.data.bindTime).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">操作人</div>
                  <div className="font-semibold text-slate-800">{selectedNode.data.operator}</div>
                </div>
              </div>

              {selectedNode.data.status === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <XCircle className="w-5 h-5" />
                    失败原因
                  </div>
                  <p className="text-sm text-red-600">{selectedNode.data.failReason}</p>
                  <div className="mt-2 text-sm text-red-500">
                    失败阶段: {selectedNode.data.failStep === 'validation' ? '数据校验' :
                              selectedNode.data.failStep === 'approval' ? '审批环节' :
                              selectedNode.data.failStep === 'system' ? '系统异常' : '数据问题'}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'flow' && selectedNode.data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">车牌号码</div>
                <div className="font-semibold text-slate-800">{selectedNode.data.plateNumber}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">入场时间</div>
                <div className="font-semibold text-slate-800 text-sm">
                  {new Date(selectedNode.data.entryTime).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">出场时间</div>
                <div className="font-semibold text-slate-800 text-sm">
                  {new Date(selectedNode.data.exitTime).toLocaleString('zh-CN')}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">停放时长</div>
                <div className="font-semibold text-slate-800">{Math.floor(selectedNode.data.duration / 60)}小时{selectedNode.data.duration % 60}分</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">费用金额</div>
                <div className="font-semibold text-slate-800">¥{selectedNode.data.amount}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">支付方式</div>
                <div className="font-semibold text-slate-800">
                  {selectedNode.data.paymentMethod === 'wechat' ? '微信支付' :
                   selectedNode.data.paymentMethod === 'alipay' ? '支付宝' :
                   selectedNode.data.paymentMethod === 'monthly' ? '包月抵扣' :
                   selectedNode.data.paymentMethod === 'unpaid' ? '未支付' : selectedNode.data.paymentMethod}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-sm text-slate-500 mb-1">是否抵扣</div>
                <div className="font-semibold text-slate-800">
                  {selectedNode.data.isDeducted ? '是' : '否'}
                </div>
              </div>
            </div>
          )}

          {selectedNode.type === 'problem' && selectedNode.data && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  问题描述
                </div>
                <p className="text-sm text-red-600">{selectedNode.data.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">触发源</div>
                  <div className="font-semibold text-slate-800">{selectedNode.data.triggerSource}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-sm text-slate-500 mb-1">责任人</div>
                  <div className="font-semibold text-slate-800">{selectedNode.data.responsibleParty}</div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                  <Clock className="w-5 h-5" />
                  当前卡点
                </div>
                <p className="text-sm text-amber-600">{selectedNode.data.stuckPoint}</p>
              </div>

              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
                  <CheckCircle className="w-5 h-5" />
                  下一步操作
                </div>
                <ul className="text-sm text-emerald-600 space-y-1">
                  {selectedNode.data.nextSteps?.map((step: string, i: number) => (
                    <li key={i}>• {step}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedRevenueId && isDataLoaded && revenues.length > 0 && (
        <div className="bg-white rounded-2xl p-12 text-center">
          <LinkIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">选择收入递延记录开始追踪</h3>
          <p className="text-slate-400">从下拉列表中选择一条收入递延记录，查看完整的数据链路</p>
        </div>
      )}
    </div>
  );
}
