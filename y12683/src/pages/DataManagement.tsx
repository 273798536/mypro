import { useState } from 'react';
import {
  Database,
  Upload,
  GitMerge,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCcw,
  Trash2,
  Search,
  Filter,
  Calendar,
  FileX,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { ImportStatusBadge, ImportSliceStatusBadge, ResultBadge } from '@/components/StatusBadge';
import { formatDate, formatNumber, formatDateShort } from '@/utils/format';

type TabType = 'imports' | 'slices' | 'measurements' | 'conclusions';

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('imports');
  const [searchText, setSearchText] = useState('');
  const {
    importRecords,
    slices,
    measurements,
    conclusions,
    tanks,
    getTankById,
    getSliceById,
    getMeasurementById,
    resetToSampleData,
    clearAllData,
  } = useAppStore();

  const tabs = [
    { id: 'imports' as TabType, label: '导入历史', icon: Upload, count: importRecords.length },
    { id: 'slices' as TabType, label: '点云切片', icon: Database, count: slices.length },
    { id: 'measurements' as TabType, label: '测量记录', icon: FileText, count: measurements.length },
    { id: 'conclusions' as TabType, label: '最终结论', icon: CheckCircle, count: conclusions.length },
  ];

  const filteredImports = importRecords.filter((r) =>
    r.tankId.toLowerCase().includes(searchText.toLowerCase()) ||
    r.fingerprint.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredSlices = slices.filter((s) =>
    s.tankName.toLowerCase().includes(searchText.toLowerCase()) ||
    s.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredMeasurements = measurements.filter((m) =>
    m.tankName.toLowerCase().includes(searchText.toLowerCase()) ||
    m.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const filteredConclusions = conclusions.filter((c) =>
    c.summary.toLowerCase().includes(searchText.toLowerCase()) ||
    c.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const duplicateCount = importRecords.filter((r) => r.status === 'duplicate_detected').length;
  const mergedCount = importRecords.filter((r) => r.mergedWith).length;
  const supplementaryCount = measurements.filter((m) => m.isSupplementary).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-deep-sea-400" />
            数据管理
          </h1>
          <p className="text-tech-gray-400 mt-1">导入历史、去重状态、测量记录与结论映射</p>
        </div>
        <div className="flex gap-3">
          <button onClick={clearAllData} className="btn-secondary flex items-center gap-2 text-sm">
            <Trash2 className="w-4 h-4" />
            清空所有
          </button>
          <button onClick={resetToSampleData} className="btn-primary flex items-center gap-2 text-sm">
            <RefreshCcw className="w-4 h-4" />
            重置示例
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-tech-gray-400 text-sm">总导入次数</span>
            <Upload className="w-5 h-5 text-deep-sea-400" />
          </div>
          <p className="text-3xl font-bold text-white">{importRecords.length}</p>
          <p className="text-xs text-tech-gray-500 mt-1">成功 {importRecords.filter(r => r.status === 'success').length} 次</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-tech-gray-400 text-sm">重复检测</span>
            <AlertTriangle className="w-5 h-5 text-warning-orange-500" />
          </div>
          <p className="text-3xl font-bold text-warning-orange-500">{duplicateCount}</p>
          <p className="text-xs text-tech-gray-500 mt-1">已合并 {mergedCount} 条</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-tech-gray-400 text-sm">切片总数</span>
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">{slices.length}</p>
          <p className="text-xs text-tech-gray-500 mt-1">
            {formatNumber(slices.reduce((a, s) => a + s.pointCount, 0), 0)} 个点
          </p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-tech-gray-400 text-sm">补录数据</span>
            <GitMerge className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-purple-400">{supplementaryCount}</p>
          <p className="text-xs text-tech-gray-500 mt-1">{conclusions.length} 条结论归档</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-deep-sea-500/20 text-white'
                    : 'text-tech-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-deep-sea-500/40' : 'bg-tech-gray-700/60'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-tech-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="input-field pl-9 py-2 text-sm w-64"
              />
            </div>
            <button className="btn-secondary text-sm py-2 flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'imports' && (
            <table className="w-full text-sm">
              <thead className="bg-tech-gray-900/60">
                <tr>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">导入ID</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">时间</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">压载舱</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">数据指纹</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">切片数</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">状态</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">关联</th>
                </tr>
              </thead>
              <tbody>
                {filteredImports.map((record) => {
                  const tank = getTankById(record.tankId);
                  return (
                    <tr key={record.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="py-4 px-6">
                        <span className="text-white font-mono text-sm">{record.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-tech-gray-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-tech-gray-500" />
                          {formatDate(record.timestamp)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-white">{tank?.name || record.tankId}</span>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-xs text-tech-gray-400 font-mono bg-tech-gray-900/60 px-2 py-1 rounded">
                          {record.fingerprint}
                        </code>
                      </td>
                      <td className="py-4 px-6 text-tech-gray-300">{record.sliceCount}</td>
                      <td className="py-4 px-6">
                        <ImportStatusBadge status={record.status} />
                      </td>
                      <td className="py-4 px-6">
                        {record.mergedWith ? (
                          <span className="text-xs text-purple-400 flex items-center gap-1">
                            <GitMerge className="w-3.5 h-3.5" />
                            合并到 {record.mergedWith}
                          </span>
                        ) : record.message ? (
                          <span className="text-xs text-tech-gray-400">{record.message}</span>
                        ) : (
                          <span className="text-xs text-tech-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredImports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-tech-gray-500">
                      <FileX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      暂无导入记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'slices' && (
            <table className="w-full text-sm">
              <thead className="bg-tech-gray-900/60">
                <tr>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">切片ID</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">压载舱</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">采集时间</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">点数</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">点密度</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">导入状态</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">关联数据</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlices.map((slice) => {
                  const relatedMeasurements = measurements.filter((m) => m.relatedSliceId === slice.id);
                  return (
                    <tr key={slice.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="py-4 px-6">
                        <span className="text-white font-mono text-sm">{slice.id}</span>
                      </td>
                      <td className="py-4 px-6 text-white">{slice.tankName}</td>
                      <td className="py-4 px-6 text-tech-gray-300">{formatDateShort(slice.timestamp)}</td>
                      <td className="py-4 px-6 text-tech-gray-300">{formatNumber(slice.pointCount, 0)}</td>
                      <td className="py-4 px-6 text-tech-gray-300">{slice.pointDensity} pts/m³</td>
                      <td className="py-4 px-6">
                        <ImportSliceStatusBadge status={slice.importStatus} />
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-deep-sea-400">
                          {relatedMeasurements.length} 条测量记录
                          {relatedMeasurements.length > 0 && (
                            <ArrowRight className="w-3 h-3 inline ml-1" />
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredSlices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-tech-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      暂无切片数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'measurements' && (
            <table className="w-full text-sm">
              <thead className="bg-tech-gray-900/60">
                <tr>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">记录ID</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">压载舱</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">关联切片</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">计算类型</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">结果</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">创建时间</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">结论</th>
                </tr>
              </thead>
              <tbody>
                {filteredMeasurements.map((m) => {
                  const relatedConclusions = conclusions.filter((c) => c.relatedMeasurementId === m.id);
                  const slice = getSliceById(m.relatedSliceId);
                  return (
                    <tr key={m.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-sm">{m.id}</span>
                          {m.isSupplementary && (
                            <span className="status-badge bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              <GitMerge className="w-3 h-3" /> 补录
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-white">{m.tankName}</td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-mono text-tech-gray-400">
                          {slice?.id || m.relatedSliceId}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-tech-gray-300">{m.formulaType}</td>
                      <td className="py-4 px-6">
                        {Object.entries(m.calculatedValues).map(([k, v]) => (
                          <span key={k} className="text-deep-sea-400 font-medium">
                            {formatNumber(v)} {k === 'volume' ? 'm³' : ''}
                          </span>
                        ))}
                      </td>
                      <td className="py-4 px-6 text-tech-gray-300">{formatDate(m.createdAt)}</td>
                      <td className="py-4 px-6">
                        {relatedConclusions.length > 0 ? (
                          relatedConclusions.map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <ResultBadge result={c.result} />
                              <span className="text-xs text-tech-gray-400">{c.summary}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-tech-gray-600 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            未生成结论
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredMeasurements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-tech-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      暂无测量记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'conclusions' && (
            <table className="w-full text-sm">
              <thead className="bg-tech-gray-900/60">
                <tr>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">结论ID</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">结果</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">摘要</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">详情</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">关联测量</th>
                  <th className="text-left py-3 px-6 text-tech-gray-400 font-medium">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredConclusions.map((c) => {
                  const measurement = getMeasurementById(c.relatedMeasurementId);
                  return (
                    <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="py-4 px-6">
                        <span className="text-white font-mono text-sm">{c.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <ResultBadge result={c.result} />
                      </td>
                      <td className="py-4 px-6 text-white font-medium">{c.summary}</td>
                      <td className="py-4 px-6 text-tech-gray-400 max-w-xs truncate">{c.details}</td>
                      <td className="py-4 px-6">
                        {measurement ? (
                          <span className="text-xs font-mono text-deep-sea-400 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            {measurement.id}
                          </span>
                        ) : (
                          <span className="text-xs text-tech-gray-600">{c.relatedMeasurementId}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-tech-gray-300">{formatDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
                {filteredConclusions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-tech-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      暂无结论数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning-orange-500" />
          数据一致性保障说明
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-tech-gray-900/40 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <GitMerge className="w-4 h-4 text-purple-400" />
              <span className="text-white text-sm font-medium">自动去重</span>
            </div>
            <p className="text-xs text-tech-gray-400">
              基于数据指纹（tankId + 时间戳 + 点数）自动检测重复导入，用户可选择合并或覆盖策略
            </p>
          </div>
          <div className="p-4 rounded-xl bg-tech-gray-900/40 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-deep-sea-400" />
              <span className="text-white text-sm font-medium">状态同步</span>
            </div>
            <p className="text-xs text-tech-gray-400">
              测量记录变更自动同步至关联结论，确保数据一致性，避免同一事件出现多份结论
            </p>
          </div>
          <div className="p-4 rounded-xl bg-tech-gray-900/40 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success-green-500" />
              <span className="text-white text-sm font-medium">可追溯</span>
            </div>
            <p className="text-xs text-tech-gray-400">
              补录数据标记来源，结论与测量记录双向关联，支持从任意节点回溯完整数据链
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
