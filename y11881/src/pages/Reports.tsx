import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileBarChart,
  Download,
  FileText,
  Table,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Eye,
} from 'lucide-react';
import { useStore } from '../store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { exportToCSV, exportToExcel, downloadFile, generateSummaryReport } from '../utils/export';

export function Reports() {
  const { denominations, inventory, shifts, transactions } = useStore();
  const [includeTrace, setIncludeTrace] = useState(false);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);

  const summary = generateSummaryReport(transactions, denominations, inventory);

  const handleExportCSV = () => {
    const csv = exportToCSV(transactions, denominations, inventory, shifts, includeTrace);
    const filename = `现金找零报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  };

  const handleExportExcel = () => {
    const blob = exportToExcel(transactions, denominations, inventory, shifts, includeTrace);
    const filename = `现金找零报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    downloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">成功</Badge>;
      case 'warning':
        return <Badge variant="warning">警告</Badge>;
      default:
        return <Badge variant="danger">失败</Badge>;
    }
  };

  const getDenomName = (id: string) => {
    return denominations.find((d) => d.id === id)?.name || id;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">报告中心</h1>
          <p className="text-gray-500 mt-1">数据导出、审计追踪、异常汇总</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">总交易数</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">
                    {summary.totalTransactions}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">找零总额</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">
                    ¥{summary.totalChangeAmount.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">成功率</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">
                    {summary.successRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <Card.Body className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">异常记录</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">
                    {summary.warningCount + summary.failedCount}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">数据导出</h2>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTrace}
                    onChange={(e) => setIncludeTrace(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                  />
                  包含追溯信息
                </label>
                <Button variant="secondary" onClick={handleExportCSV} icon={<FileText className="w-4 h-4" />}>
                  导出 CSV
                </Button>
                <Button variant="primary" onClick={handleExportExcel} icon={<Table className="w-4 h-4" />}>
                  导出 Excel
                </Button>
              </div>
            </div>
          </Card.Header>
          <Card.Body>
            <p className="text-sm text-gray-500">
              导出内容包含：交易记录、库存状态、班次信息。选择"包含追溯信息"将导出算法版本和库存快照，用于审计和问题追踪。
            </p>
          </Card.Body>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <Card.Header>
            <div className="flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-800">交易记录</h2>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">时间</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">班次</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作员</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">应收</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">实收</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">找零</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((tx) => (
                      <tr
                        key={tx.id}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(tx.timestamp).toLocaleString('zh-CN')}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {shifts.find((s) => s.id === tx.shiftId)?.name || tx.shiftId}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {tx.operator}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono text-gray-600">
                          ¥{tx.receivableAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono text-gray-600">
                          ¥{tx.receivedAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-slate-800">
                          ¥{tx.changeAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(tx.status)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedTx(selectedTx === tx.id ? null : tx.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {selectedTx && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <h4 className="font-semibold text-slate-800 mb-3">详细信息 - 来源追溯</h4>
                {(() => {
                  const tx = transactions.find((t) => t.id === selectedTx);
                  if (!tx) return null;
                  return (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">算法:</span>{' '}
                        <span className="font-medium text-slate-700">{tx.sourceTrace.algorithm}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">操作员:</span>{' '}
                        <span className="font-medium text-slate-700">{tx.sourceTrace.operator}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">找零明细:</span>{' '}
                        <span className="font-medium text-slate-700">
                          {tx.changeDetails
                            .map((d) => `${getDenomName(d.denominationId)} x${d.quantity}`)
                            .join(', ')}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">库存快照:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(tx.sourceTrace.inventorySnapshot).map(([id, qty]) => (
                            <Badge key={id} variant="neutral">
                              {getDenomName(id)}: {qty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </Card.Body>
        </Card>
      </motion.div>
    </div>
  );
}
