import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { SampleStatusBadge, InfoTooltip } from '@/components/StatusBadges';
import { FileSpreadsheet, Search, Filter, Skull, Image, FileText, ChevronRight, Link2 } from 'lucide-react';

export default function SampleList() {
  const navigate = useNavigate();
  const { samples, batches } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBatch, setFilterBatch] = useState<string>('all');

  const filteredSamples = samples.filter((s) => {
    const matchSearch =
      s.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.imageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sourceNote.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchBatch = filterBatch === 'all' || s.batchId === filterBatch;
    return matchSearch && matchStatus && matchBatch;
  });

  const contaminatedCount = samples.filter((s) => s.status === 'contaminated').length;
  const correctedCount = samples.filter((s) => s.status === 'corrected').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-serif-cn font-bold text-abyss-900 mb-1">样本清单</h2>
        <p className="text-sm text-abyss-500">
          所有样本保留原始行号、图片名和来源备注，可追溯到原始记录
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-base p-4 animate-fade-in-up stagger-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-abyss-100 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-abyss-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-abyss-900">{samples.length}</div>
              <div className="text-xs text-abyss-500">总样本数</div>
            </div>
          </div>
        </div>
        <div className="card-base p-4 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-moss-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-moss-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-moss-600">
                {samples.length - contaminatedCount}
              </div>
              <div className="text-xs text-abyss-500">有效样本</div>
            </div>
          </div>
        </div>
        <div className="card-base p-4 animate-fade-in-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-crimson-100 flex items-center justify-center">
              <Skull className="w-5 h-5 text-crimson-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-crimson-600">{contaminatedCount}</div>
              <div className="text-xs text-abyss-500">污染样本</div>
            </div>
          </div>
        </div>
        <div className="card-base p-4 animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Image className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{correctedCount}</div>
              <div className="text-xs text-abyss-500">已修正</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-base overflow-hidden animate-fade-in-up stagger-2">
        <div className="px-6 py-4 border-b border-abyss-100/80">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-abyss-400" />
              <input
                type="text"
                placeholder="搜索样本ID、图片名、来源备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-abyss-200 rounded-md text-sm text-abyss-700 focus:outline-none focus:ring-2 focus:ring-abyss-300 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-abyss-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border border-abyss-200 rounded-md px-3 py-1.5 text-abyss-700 focus:outline-none focus:ring-2 focus:ring-abyss-300 bg-white"
                >
                  <option value="all">全部状态</option>
                  <option value="normal">正常</option>
                  <option value="contaminated">污染</option>
                  <option value="corrected">已修正</option>
                </select>
              </div>
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="text-sm border border-abyss-200 rounded-md px-3 py-1.5 text-abyss-700 focus:outline-none focus:ring-2 focus:ring-abyss-300 bg-white"
              >
                <option value="all">全部批次</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-ivory-50/80">
                <th className="table-header text-left px-4 py-3">
                  原始行号
                  <InfoTooltip text="保留原始数据文件中的行号，便于追溯到原始记录" />
                </th>
                <th className="table-header text-left px-4 py-3">样本ID</th>
                <th className="table-header text-left px-4 py-3">所属批次</th>
                <th className="table-header text-left px-4 py-3">组别</th>
                <th className="table-header text-right px-4 py-3">浓度</th>
                <th className="table-header text-right px-4 py-3">存活率</th>
                <th className="table-header text-left px-4 py-3">图片名</th>
                <th className="table-header text-left px-4 py-3">状态</th>
                <th className="table-header text-right px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-abyss-50">
              {filteredSamples.map((sample, index) => {
                const batch = batches.find((b) => b.id === sample.batchId);
                return (
                  <tr
                    key={sample.id}
                    className={`hover:bg-abyss-50/40 transition-colors ${
                      sample.status === 'contaminated' ? 'bg-crimson-50/30' : ''
                    }`}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center text-sm font-mono text-abyss-600 bg-abyss-50 px-2 py-0.5 rounded min-w-[3rem] text-center">
                        #{sample.originalRowNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/batch/${sample.batchId}?sample=${sample.id}`)}
                        className="text-sm font-medium text-abyss-700 hover:text-abyss-900 flex items-center gap-1 group"
                      >
                        <Link2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {sample.sampleId}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-abyss-600">{batch?.name || sample.batchId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-abyss-700">{sample.groupName}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-abyss-600">{sample.concentration} μg/mL</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-medium ${
                          sample.status === 'contaminated'
                            ? 'text-crimson-400 line-through'
                            : sample.survivalRate >= 80
                            ? 'text-moss-600'
                            : sample.survivalRate >= 40
                            ? 'text-amber-600'
                            : 'text-crimson-600'
                        }`}
                      >
                        {sample.survivalRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-abyss-500 bg-ivory-50 px-2 py-1 rounded">
                        {sample.imageName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SampleStatusBadge status={sample.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/batch/${sample.batchId}`)}
                        className="text-sm text-abyss-500 hover:text-abyss-700 flex items-center gap-1 ml-auto"
                      >
                        查看批次
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSamples.length === 0 && (
          <div className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-abyss-200 mx-auto mb-3" />
            <p className="text-sm text-abyss-400">没有找到匹配的样本</p>
          </div>
        )}
      </div>

      <div className="card-base p-6 animate-fade-in-up stagger-4">
        <h3 className="section-title">来源备注说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...new Set(samples.map((s) => s.sourceNote))].map((note, idx) => {
            const count = samples.filter((s) => s.sourceNote === note).length;
            return (
              <div key={idx} className="p-4 bg-ivory-50 rounded-lg">
                <p className="text-sm text-abyss-700 mb-2">{note}</p>
                <p className="text-xs text-abyss-500">关联 {count} 个样本</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
