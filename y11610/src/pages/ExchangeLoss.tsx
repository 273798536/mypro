import { useEffect, useState } from 'react';
import {
  Calculator,
  Download,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useUIStore } from '../store/useUIStore';
import { ANOMALY_LABELS, LOSS_STATUS_LABELS, ExchangeLoss, LossStatus } from '../types';
import { calculateAllExchangeLosses, updateLossStatus } from '../services/exchangeService';
import { exportLossReport } from '../services/exportService';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';

export default function ExchangeLossPage() {
  const { loadAllData, isLoaded, losses, matchings, orders, refreshData } = useDataStore();
  const { showToast, setLoading, openDetail } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<LossStatus | 'all'>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isLoaded) {
      loadAllData();
    }
  }, [isLoaded, loadAllData]);

  const handleCalculate = async () => {
    setLoading(true, '正在计算汇损...');
    try {
      const result = await calculateAllExchangeLosses();
      await refreshData();
      showToast(
        'success',
        `计算完成：共 ${result.total} 笔，异常 ${result.anomalies} 笔`
      );
    } catch (error) {
      showToast('error', '计算失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true, '正在导出...');
    try {
      await exportLossReport(filteredLosses);
      showToast('success', '导出成功');
    } catch (error) {
      showToast('error', '导出失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: LossStatus) => {
    setLoading(true, '正在更新...');
    try {
      await updateLossStatus(id, status);
      await refreshData();
      showToast('success', '状态已更新');
    } catch (error) {
      showToast('error', '更新失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getOrderById = (id: string) => {
    return orders.find((o) => o.id === id);
  };

  const getMatchingByOrderId = (orderId: string) => {
    return matchings.find((m) => m.orderId === orderId);
  };

  const filteredLosses = losses.filter((loss) => {
    if (statusFilter !== 'all' && loss.status !== statusFilter) return false;
    if (anomalyFilter !== 'all' && loss.anomalyType !== anomalyFilter) return false;
    if (searchTerm) {
      const order = getOrderById(loss.orderId);
      const term = searchTerm.toLowerCase();
      if (order?.orderNo.toLowerCase().includes(term)) return true;
      if (order?.customerName.toLowerCase().includes(term)) return true;
      return false;
    }
    return true;
  });

  const totalLossAmount = filteredLosses.reduce((sum, l) => sum + l.lossAmount, 0);
  const anomalyCount = filteredLosses.filter((l) => l.anomalyType !== 'none').length;

  const StatusBadge = ({ status }: { status: LossStatus }) => {
    const colors: Record<LossStatus, string> = {
      pending: 'bg-warning-100 text-warning-700',
      confirmed: 'bg-primary-100 text-primary-700',
      adjusted: 'bg-success-100 text-success-700',
      ignored: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`badge ${colors[status]}`}>
        {LOSS_STATUS_LABELS[status]}
      </span>
    );
  };

  const AnomalyBadge = ({ type }: { type: string }) => {
    if (type === 'none') {
      return <span className="badge bg-success-100 text-success-700">正常</span>;
    }
    return (
      <span className="badge bg-warning-100 text-warning-700">
        {ANOMALY_LABELS[type as keyof typeof ANOMALY_LABELS] || type}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">汇损明细</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-secondary">
            <Download size={18} />
            导出报表
          </button>
          <button onClick={handleCalculate} className="btn btn-primary">
            <Calculator size={18} />
            计算汇损
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">总记录数</p>
          <p className="text-2xl font-bold text-gray-800">{filteredLosses.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">累计汇损</p>
          <p className="text-2xl font-bold text-danger-600">
            {formatCurrency(totalLossAmount, 'CNY')}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">异常笔数</p>
          <p className="text-2xl font-bold text-warning-600">{anomalyCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">待确认</p>
          <p className="text-2xl font-bold text-primary-600">
            {filteredLosses.filter((l) => l.status === 'pending').length}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部状态
            </button>
            {(['pending', 'confirmed', 'adjusted', 'ignored'] as LossStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {LOSS_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAnomalyFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                anomalyFilter === 'all'
                  ? 'bg-warning-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部异常
            </button>
            {Object.entries(ANOMALY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setAnomalyFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  anomalyFilter === key
                    ? 'bg-warning-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-xs ml-auto">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索订单号、客户名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">订单信息</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">计算日期</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">应收金额</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">实收金额</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">汇损金额</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">汇损率</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">异常类型</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredLosses.length > 0 ? (
                filteredLosses.map((loss) => {
                  const order = getOrderById(loss.orderId);
                  const matching = getMatchingByOrderId(loss.orderId);
                  const lossRate =
                    order && order.amount > 0
                      ? ((loss.lossAmount / order.amount) * 100).toFixed(2)
                      : '0.00';
                  return (
                    <tr key={loss.id} className="border-b border-gray-100 table-row-hover">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{order?.orderNo || '-'}</p>
                        <p className="text-xs text-gray-500">{order?.customerName || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(loss.calculationDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {order ? formatCurrency(order.amount, order.currency) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {matching ? formatCurrency(matching.receivedAmountCNY, 'CNY') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-danger-600">
                        {formatCurrency(loss.lossAmount, 'CNY')}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{lossRate}%</td>
                      <td className="px-4 py-3 text-center">
                        <AnomalyBadge type={loss.anomalyType} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={loss.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetail('loss', loss.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            title="查看详情"
                          >
                            <Eye size={16} />
                          </button>
                          {loss.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(loss.id, 'confirmed')}
                                className="p-1.5 rounded hover:bg-success-50 text-gray-500 hover:text-success-600"
                                title="确认"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleStatusChange(loss.id, 'ignored')}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                title="忽略"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    暂无汇损记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
