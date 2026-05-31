import { useState } from 'react';
import { Plus, Edit2, Eye, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { formatCurrency, formatDate } from '../utils/calculator';
import { ClaimStatus } from '../types';

const statusConfig: Record<ClaimStatus, { label: string; icon: any; className: string }> = {
  pending: { label: '待处理', icon: Clock, className: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '已确认', icon: CheckCircle, className: 'bg-green-100 text-green-700' },
  closed: { label: '已结案', icon: CheckCircle, className: 'bg-gray-100 text-gray-700' },
};

export default function Claims() {
  const { claims, updateClaim } = useAppStore();
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">赔案单管理</h1>
          <p className="text-gray-500 mt-1">管理所有赔案信息</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors">
          <Plus className="w-4 h-4" />
          新增赔案
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  赔案编号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  出险日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  被保险人
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  险别
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  赔款金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  标记
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {claims.map((claim) => {
                const StatusIcon = statusConfig[claim.status].icon;
                return (
                  <tr
                    key={claim.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{claim.caseNo}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(claim.accidentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {claim.insured}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {claim.riskType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {formatCurrency(claim.totalLoss)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[claim.status].className}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig[claim.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {claim.hasMissingFields && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            <AlertCircle className="w-3 h-3" />
                            缺字段
                          </span>
                        )}
                        {claim.lateSupplement && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            <Clock className="w-3 h-3" />
                            晚补
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedClaim(claim.id)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateClaim(claim.id, { status: 'confirmed' })}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">赔案详情</h3>
            </div>
            <div className="p-6">
              {(() => {
                const claim = claims.find((c) => c.id === selectedClaim);
                if (!claim) return null;
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">赔案编号</p>
                        <p className="font-medium text-gray-900">{claim.caseNo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">出险日期</p>
                        <p className="font-medium text-gray-900">{formatDate(claim.accidentDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">被保险人</p>
                        <p className="font-medium text-gray-900">{claim.insured}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">险别</p>
                        <p className="font-medium text-gray-900">{claim.riskType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">赔款金额</p>
                        <p className="font-medium text-gray-900">{formatCurrency(claim.totalLoss)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">状态</p>
                        <p className="font-medium text-gray-900">{statusConfig[claim.status].label}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">备注</p>
                      <p className="text-gray-900">{claim.remark || '无'}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
