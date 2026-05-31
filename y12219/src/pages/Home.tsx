import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Eye, Tag, Receipt, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRefundStore } from '@/store/useRefundStore';
import { formatCurrency } from '@/lib/utils';
import FilterPanel from '@/components/FilterPanel';
import type { RefundRecord } from '@/types';

const STATUS_COLORS: Record<RefundRecord['status'], string> = {
  '待处理': 'bg-[#d4943a]/10 text-[#d4943a]',
  '已计算': 'bg-emerald-50 text-emerald-600',
  '已导出': 'bg-gray-100 text-gray-600',
};

const PIE_COLORS = ['#d4943a', '#ef4444', '#3b82f6', '#10b981', '#6366f1'];

export default function Home() {
  const navigate = useNavigate();
  const getFilteredRecords = useRefundStore((s) => s.getFilteredRecords);
  const records = getFilteredRecords();

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const totalData = useMemo(
    () =>
      records.reduce(
        (acc, r) => {
          acc.total += r.breakdown.courseFeeRefund;
          acc.discountRecovery += r.breakdown.discountRecovery;
          acc.material += r.breakdown.materialDeduction;
          acc.actual += r.breakdown.actualRefund;
          return acc;
        },
        { total: 0, discountRecovery: 0, material: 0, actual: 0 }
      ),
    [records]
  );

  const pieData = useMemo(
    () =>
      [
        { name: '课时费退款', value: totalData.total },
        { name: '优惠追回', value: totalData.discountRecovery },
        { name: '资料扣费', value: totalData.material },
      ].filter((d) => d.value > 0),
    [totalData]
  );

  const barData = useMemo(() => {
    const courseStats: Record<string, number> = {};
    records.forEach((r) => {
      if (!courseStats[r.courseName]) {
        courseStats[r.courseName] = 0;
      }
      courseStats[r.courseName] += r.breakdown.actualRefund;
    });
    return Object.entries(courseStats).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [records]);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#1a2332] mb-1">线上课程退款拆分</h1>
          <p className="text-sm text-gray-500">教育财务统一口径，优惠追回有据可依，进度改动可见</p>
        </div>

        <div className="mb-5">
          <FilterPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1a2332] mb-4">退款构成</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ fontSize: '12px', border: 'none', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1a2332] mb-4">按课程实退金额</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ fontSize: '12px', border: 'none', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="#d4943a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1a2332] mb-4">统计概览</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">退款记录数</span>
                <span className="text-base font-semibold text-[#1a2332]">{records.length} 条</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">总实退金额</span>
                <span className="text-base font-semibold text-[#d4943a]">{formatCurrency(totalData.actual)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">总优惠追回</span>
                <span className="text-base font-semibold text-red-500">{formatCurrency(totalData.discountRecovery)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">总资料扣费</span>
                <span className="text-base font-semibold text-blue-500">{formatCurrency(totalData.material)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#1a2332]">退款明细列表</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">退款编号</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">学员</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">课程</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">实退金额</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">状态</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">创建日期</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <React.Fragment key={record.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(record.id)}
                    >
                      <td className="px-5 py-3 text-sm text-[#1a2332] font-medium">{record.id}</td>
                      <td className="px-5 py-3 text-sm text-[#1a2332]">{record.studentName}</td>
                      <td className="px-5 py-3 text-sm text-[#1a2332]">{record.courseName}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-[#d4943a]">{formatCurrency(record.breakdown.actualRefund)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[record.status]}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{record.createDate}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/refund/${record.id}`);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-[#d4943a] hover:underline"
                          >
                            <Eye size={14} />
                            详情
                          </button>
                          {expandedRow === record.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === record.id && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50">
                          <div className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Receipt size={14} className="text-[#d4943a]" />
                                  <span className="text-xs font-semibold text-[#1a2332]">订单来源</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500">
                                    订单编号：<span className="text-[#1a2332]">{record.order.id}</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    订单金额：<span className="text-[#1a2332]">{formatCurrency(record.order.orderAmount)}</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    支付方式：<span className="text-[#1a2332]">{record.order.payMethod}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Tag size={14} className="text-blue-500" />
                                  <span className="text-xs font-semibold text-[#1a2332]">优惠来源</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500">
                                    优惠券：<span className="text-[#1a2332]">{record.coupon.couponName}</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    面额：<span className="text-[#1a2332]">{formatCurrency(record.coupon.couponAmount)}</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    追回状态：<span className="text-[#1a2332]">{record.coupon.recoveryStatus}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertCircle size={14} className="text-emerald-500" />
                                  <span className="text-xs font-semibold text-[#1a2332]">退款说明来源</span>
                                </div>
                                {record.explanations.length === 0 ? (
                                  <p className="text-xs text-gray-400">暂无说明</p>
                                ) : (
                                  <div className="space-y-1">
                                    {record.explanations.slice(0, 2).map((exp) => (
                                      <p key={exp.id} className="text-xs text-gray-500">
                                        <span
                                          className="inline-block w-2 h-2 rounded-full mr-1"
                                          style={{ backgroundColor: exp.type === '进度补录' ? '#d4943a' : exp.type === '优惠追回' ? '#ef4444' : '#3b82f6' }}
                                        />
                                        {exp.type}：{exp.title}
                                      </p>
                                    ))}
                                    {record.explanations.length > 2 && (
                                      <p className="text-xs text-gray-400">等 {record.explanations.length} 条说明</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">
                      暂无符合条件的退款记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
