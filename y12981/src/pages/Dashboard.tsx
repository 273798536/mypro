import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  Upload, Play, Download, CheckCircle, ArrowRightLeft,
  Activity, AlertTriangle, Database, Clock, TrendingUp
} from 'lucide-react';
import { ConnectionPoolData, DiagnosisResult } from '../../shared/types';
import crypto from 'crypto-js';

const Dashboard: React.FC = () => {
  const {
    batches,
    currentBatch,
    currentResults,
    loading,
    fetchBatches,
    fetchBatchResults,
    importData,
    runDiagnosis,
    confirmDiagnosis,
    compareBatches,
    versionComparison
  } = useStore();

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [compareBatchId, setCompareBatchId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [importDataText, setImportDataText] = useState('');
  const [importReason, setImportReason] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
      fetchBatchResults(batches[0].id);
    }
  }, [batches]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchResults(selectedBatchId);
    }
  }, [selectedBatchId]);

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
  };

  const handleImport = async () => {
    try {
      const data = JSON.parse(importDataText);
      const batch = await importData(data, importReason);
      setSelectedBatchId(batch.id);
      setShowImportModal(false);
      setImportDataText('');
      setImportReason('');
    } catch (error) {
      alert('数据格式错误，请检查JSON格式');
    }
  };

  const handleRunDiagnosis = async () => {
    if (selectedBatchId) {
      await runDiagnosis(selectedBatchId);
    }
  };

  const handleConfirm = async () => {
    if (selectedBatchId) {
      await confirmDiagnosis(selectedBatchId, '复核通过，诊断结果准确');
    }
  };

  const handleDownload = () => {
    if (selectedBatchId) {
      window.open(`/api/diagnosis/${selectedBatchId}/download`, '_blank');
    }
  };

  const handleCompare = () => {
    if (selectedBatchId && compareBatchId && selectedBatchId !== compareBatchId) {
      compareBatches(selectedBatchId, compareBatchId);
      setShowCompareModal(true);
    }
  };

  const chartData = currentBatch?.rawData.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    活跃连接: d.activeConnections,
    空闲连接: d.idleConnections,
    等待队列: d.waitingRequests,
    使用率: ((d.totalConnections / d.maxConnections) * 100).toFixed(1)
  })) || [];

  const severityData = [
    { name: '严重', value: currentResults.filter(r => r.severity === 'critical').length, color: '#ef4444' },
    { name: '警告', value: currentResults.filter(r => r.severity === 'warning').length, color: '#f97316' },
    { name: '正常', value: currentResults.filter(r => r.severity === 'normal').length, color: '#10b981' },
  ];

  const stats = currentBatch?.rawData[0] ? {
    avgUsage: (currentBatch.rawData.reduce((sum, d) => sum + (d.totalConnections / d.maxConnections) * 100, 0) / currentBatch.rawData.length).toFixed(1),
    maxWaiting: Math.max(...currentBatch.rawData.map(d => d.waitingRequests)),
    totalTimeouts: currentBatch.rawData.reduce((sum, d) => sum + d.timeoutCount, 0),
    avgErrorRate: (currentBatch.rawData.reduce((sum, d) => sum + d.errorRate, 0) / currentBatch.rawData.length).toFixed(2)
  } : null;

  const generateSampleData = () => {
    const now = Date.now();
    const data: ConnectionPoolData[] = Array.from({ length: 8 }, (_, i) => ({
      id: 'conn-' + crypto.MD5('sample' + i + now).toString(),
      timestamp: now - (8 - i) * 300000,
      poolName: 'main-db-pool',
      activeConnections: 45 + Math.floor(Math.random() * 30),
      idleConnections: 20 + Math.floor(Math.random() * 15),
      waitingRequests: Math.floor(Math.random() * 8),
      totalConnections: 70 + Math.floor(Math.random() * 20),
      maxConnections: 100,
      timeoutCount: Math.floor(Math.random() * 5),
      errorRate: Math.random() * 4,
      avgWaitTime: 100 + Math.random() * 800,
      host: '192.168.1.5',
      port: 3306,
      database: 'main_db'
    }));
    setImportDataText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">数据库连接池诊断</h1>
          <p className="text-navy-400 mt-1 text-sm">实时监控连接池状态，快速定位问题</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<Upload size={16} />}
            onClick={() => setShowImportModal(true)}
          >
            导入数据
          </Button>
          <Button
            variant="primary"
            icon={<Play size={16} />}
            onClick={handleRunDiagnosis}
            disabled={!selectedBatchId || currentBatch?.status === 'completed' || loading}
            loading={loading}
          >
            执行诊断
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-navy-800 rounded-xl p-5 border border-navy-700 hover:border-blue-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp size={20} className="text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.avgUsage}%</span>
            </div>
            <p className="text-navy-400 text-sm mt-2">平均使用率</p>
          </div>
          <div className="bg-navy-800 rounded-xl p-5 border border-navy-700 hover:border-orange-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Clock size={20} className="text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.maxWaiting}</span>
            </div>
            <p className="text-navy-400 text-sm mt-2">最大等待队列</p>
          </div>
          <div className="bg-navy-800 rounded-xl p-5 border border-navy-700 hover:border-red-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.totalTimeouts}</span>
            </div>
            <p className="text-navy-400 text-sm mt-2">超时次数</p>
          </div>
          <div className="bg-navy-800 rounded-xl p-5 border border-navy-700 hover:border-green-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Activity size={20} className="text-green-400" />
              </div>
              <span className="text-2xl font-bold text-white">{stats.avgErrorRate}%</span>
            </div>
            <p className="text-navy-400 text-sm mt-2">平均错误率</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">连接池趋势</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  活跃连接
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  空闲连接
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  等待队列
                </span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line type="monotone" dataKey="活跃连接" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="空闲连接" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="等待队列" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
            <div className="p-4 border-b border-navy-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">诊断结果</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<CheckCircle size={14} />}
                  onClick={handleConfirm}
                  disabled={currentBatch?.status !== 'completed'}
                >
                  确认结果
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Download size={14} />}
                  onClick={handleDownload}
                  disabled={currentBatch?.status !== 'completed'}
                >
                  下载报告
                </Button>
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              {currentResults.length === 0 ? (
                <div className="p-12 text-center text-navy-400">
                  <Database size={48} className="mx-auto mb-3 opacity-50" />
                  <p>暂无诊断结果，请先执行诊断</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-navy-700/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">级别</th>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">问题类型</th>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">连接池</th>
                      <th className="text-left p-3 text-sm font-medium text-navy-300">描述</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResults.map((result, idx) => (
                      <tr
                        key={result.id}
                        className={`border-t border-navy-700 hover:bg-navy-700/30 transition-colors ${
                          idx % 2 === 0 ? 'bg-navy-800/50' : ''
                        }`}
                      >
                        <td className="p-3">
                          <StatusBadge status={result.severity}>
                            {result.severity === 'critical' ? '严重' : result.severity === 'warning' ? '警告' : '正常'}
                          </StatusBadge>
                        </td>
                        <td className="p-3 text-sm text-white font-mono">{result.issueType}</td>
                        <td className="p-3 text-sm text-navy-300">{result.poolName}</td>
                        <td className="p-3 text-sm text-navy-200 max-w-md truncate">{result.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
            <h3 className="text-lg font-semibold text-white mb-4">诊断概览</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {severityData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-sm text-navy-300">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-navy-800 rounded-xl p-6 border border-navy-700">
            <h3 className="text-lg font-semibold text-white mb-4">版本对比</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-navy-300 mb-1 block">基准版本</label>
                <select
                  value={selectedBatchId || ''}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {new Date(b.timestamp).toLocaleString('zh-CN')} - {b.operator}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-center">
                <ArrowRightLeft size={20} className="text-navy-500" />
              </div>
              <div>
                <label className="text-sm text-navy-300 mb-1 block">对比版本</label>
                <select
                  value={compareBatchId || ''}
                  onChange={(e) => setCompareBatchId(e.target.value)}
                  className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">选择对比版本...</option>
                  {batches.filter(b => b.id !== selectedBatchId).map(b => (
                    <option key={b.id} value={b.id}>
                      {new Date(b.timestamp).toLocaleString('zh-CN')} - {b.operator}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                className="w-full"
                variant="secondary"
                icon={<ArrowRightLeft size={16} />}
                onClick={handleCompare}
                disabled={!selectedBatchId || !compareBatchId}
              >
                对比版本
              </Button>
            </div>
          </div>

          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
            <div className="p-4 border-b border-navy-700">
              <h3 className="text-lg font-semibold text-white">历史批次</h3>
            </div>
            <div className="max-h-64 overflow-auto">
              {batches.map(batch => (
                <div
                  key={batch.id}
                  onClick={() => handleBatchSelect(batch.id)}
                  className={`p-4 border-b border-navy-700 cursor-pointer transition-colors ${
                    selectedBatchId === batch.id
                      ? 'bg-blue-600/20 border-l-4 border-l-blue-500'
                      : 'hover:bg-navy-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{batch.operator}</span>
                    <StatusBadge status={batch.status as any}>
                      {batch.status === 'completed' ? '已完成' : batch.status === 'pending' ? '待诊断' : '处理中'}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-navy-400 mt-1">
                    {new Date(batch.timestamp).toLocaleString('zh-CN')}
                  </p>
                  <p className="text-xs text-navy-500 mt-1 font-mono truncate">{batch.dataHash.slice(0, 16)}...</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="导入连接池数据"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-navy-300 mb-1 block">导入原因</label>
            <input
              type="text"
              value={importReason}
              onChange={(e) => setImportReason(e.target.value)}
              placeholder="例如：月结前例行检查"
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-navy-300 mb-1 block">JSON 数据</label>
            <textarea
              value={importDataText}
              onChange={(e) => setImportDataText(e.target.value)}
              placeholder="粘贴连接池监控数据的JSON格式..."
              rows={12}
              className="w-full bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={generateSampleData}
            >
              生成示例数据
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!importDataText.trim()}
              >
                导入
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="版本对比结果"
        size="xl"
      >
        {versionComparison && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-navy-700/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">{versionComparison.summary.totalChanges}</p>
                <p className="text-sm text-navy-400">总变更数</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/30">
                <p className="text-2xl font-bold text-red-400">{versionComparison.summary.criticalChanges}</p>
                <p className="text-sm text-navy-400">严重变更</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-4 text-center border border-orange-500/30">
                <p className="text-2xl font-bold text-orange-400">{versionComparison.summary.warningChanges}</p>
                <p className="text-sm text-navy-400">警告变更</p>
              </div>
            </div>
            <div className="text-sm text-navy-400">
              <p>版本 1: {new Date(versionComparison.timestamp1).toLocaleString('zh-CN')}</p>
              <p>版本 2: {new Date(versionComparison.timestamp2).toLocaleString('zh-CN')}</p>
            </div>
            <div className="max-h-96 overflow-auto border border-navy-700 rounded-lg">
              <table className="w-full">
                <thead className="bg-navy-700 sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-navy-300">字段</th>
                    <th className="text-left p-3 text-sm font-medium text-navy-300">变更类型</th>
                    <th className="text-left p-3 text-sm font-medium text-navy-300">版本 1</th>
                    <th className="text-left p-3 text-sm font-medium text-navy-300">版本 2</th>
                    <th className="text-left p-3 text-sm font-medium text-navy-300">级别</th>
                  </tr>
                </thead>
                <tbody>
                  {versionComparison.differences.map((diff, idx) => (
                    <tr key={idx} className="border-t border-navy-700 hover:bg-navy-700/30">
                      <td className="p-3 text-sm font-mono text-white">{diff.field}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          diff.changeType === 'added' ? 'bg-green-500/20 text-green-400' :
                          diff.changeType === 'removed' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {diff.changeType === 'added' ? '新增' : diff.changeType === 'removed' ? '删除' : '修改'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-navy-300 font-mono">
                        {diff.value1 !== null && diff.value1 !== undefined 
                          ? String(JSON.stringify(diff.value1) || diff.value1).slice(0, 50) 
                          : '-'}
                      </td>
                      <td className="p-3 text-sm text-navy-300 font-mono">
                        {diff.value2 !== null && diff.value2 !== undefined 
                          ? String(JSON.stringify(diff.value2) || diff.value2).slice(0, 50) 
                          : '-'}
                      </td>
                      <td className="p-3">
                        {diff.severity && (
                          <StatusBadge status={diff.severity}>
                            {diff.severity === 'critical' ? '严重' : diff.severity === 'warning' ? '警告' : '正常'}
                          </StatusBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
