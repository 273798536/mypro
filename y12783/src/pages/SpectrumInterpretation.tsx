import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDateShort } from '../../shared/utils/calculate';
import {
  FileBarChart,
  Eye,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import type { SpectrumRecord } from '../../shared/types';

export function SpectrumInterpretation() {
  const { spectrums, fetchSpectrums, batches, fetchBatches } = useAppStore();
  const [search, setSearch] = useState('');
  const [interpretedFilter, setInterpretedFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [selectedSpectrum, setSelectedSpectrum] = useState<SpectrumRecord | null>(null);
  const [showInterpretModal, setShowInterpretModal] = useState(false);
  const [interpretForm, setInterpretForm] = useState({
    status: 'pass' as 'pass' | 'pending' | 'fail',
    remark: '',
    interpreter: '管理员',
    consistentWithThickness: true,
  });

  useEffect(() => {
    fetchSpectrums();
    fetchBatches();
  }, [fetchSpectrums, fetchBatches]);

  const filteredSpectrums = spectrums.filter((s) => {
    if (interpretedFilter === 'pending' && s.interpreted) return false;
    if (interpretedFilter === 'done' && !s.interpreted) return false;
    if (search) {
      const batch = batches.find((b) => b.id === s.batchId);
      const s2 = search.toLowerCase();
      return (
        (batch?.batchNo || '').toLowerCase().includes(s2) ||
        (batch?.materialName || '').toLowerCase().includes(s2) ||
        (s.spectrumFile || '').toLowerCase().includes(s2)
      );
    }
    return true;
  });

  const getBatchInfo = (batchId: string) => {
    return batches.find((b) => b.id === batchId);
  };

  const handleInterpret = async () => {
    if (!selectedSpectrum) return;

    try {
      await useAppStore.getState().interpretSpectrum(selectedSpectrum.id, interpretForm);
      setShowInterpretModal(false);
      setSelectedSpectrum(null);
      alert('判读已保存');
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    }
  };

  const openInterpret = (spectrum: SpectrumRecord) => {
    setSelectedSpectrum(spectrum);
    setInterpretForm({
      status: spectrum.interpretationStatus || 'pass',
      remark: spectrum.interpretationRemark || '',
      interpreter: '管理员',
      consistentWithThickness: spectrum.consistentWithThickness ?? true,
    });
    setShowInterpretModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">谱图总数</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{spectrums.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">待判读</p>
          <p className="text-2xl font-semibold text-amber-600 mt-1">
            {spectrums.filter((s) => !s.interpreted).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">已判读</p>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">
            {spectrums.filter((s) => s.interpreted).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">判读通过率</p>
          <p className="text-2xl font-semibold text-sky-600 mt-1">
            {spectrums.filter((s) => s.interpretationStatus === 'pass').length}
            <span className="text-sm font-normal text-slate-400 ml-1">/ {spectrums.length}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-medium text-slate-800 flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-sky-600" />
            谱图列表
          </h2>
          <div className="text-xs text-slate-400">
            月底或课前集中判读，结果与厚度估算联动校验
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索批次号、材料名称..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">状态：</span>
            {(['all', 'pending', 'done'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setInterpretedFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  interpretedFilter === s
                    ? 'bg-sky-50 border-sky-300 text-sky-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? '全部' : s === 'pending' ? '待判读' : '已判读'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">谱图文件</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">关联批次</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">材料</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">采集时间</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">判读状态</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">与厚度估算</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">判读人</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSpectrums.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    暂无谱图数据
                  </td>
                </tr>
              ) : (
                filteredSpectrums.map((spectrum) => {
                  const batch = getBatchInfo(spectrum.batchId);
                  return (
                    <tr key={spectrum.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-700 text-xs">
                        {spectrum.spectrumFile}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                        {batch?.batchNo || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{batch?.materialName || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateShort(spectrum.capturedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {spectrum.interpreted ? (
                          <StatusBadge status={spectrum.interpretationStatus!} type="result" />
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">
                            待判读
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {spectrum.interpreted ? (
                          spectrum.consistentWithThickness ? (
                            <span className="inline-flex items-center text-emerald-600 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              一致
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-amber-600 text-xs">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                              待确认
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {spectrum.interpretedBy || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openInterpret(spectrum)}
                          className="inline-flex items-center text-sky-600 hover:text-sky-700 text-sm"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {spectrum.interpreted ? '查看/修改' : '判读'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInterpretModal && selectedSpectrum && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-medium text-slate-800 mb-1">谱图判读</h3>
            <p className="text-sm text-slate-500 mb-4">
              {selectedSpectrum.spectrumFile}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-2">判读结论</label>
                <div className="flex gap-2">
                  {(['pass', 'pending', 'fail'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setInterpretForm({ ...interpretForm, status: s })}
                      className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                        interpretForm.status === s
                          ? s === 'pass'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : s === 'fail'
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s === 'pass' ? '通过' : s === 'fail' ? '未通过' : '待确认'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interpretForm.consistentWithThickness}
                    onChange={(e) =>
                      setInterpretForm({ ...interpretForm, consistentWithThickness: e.target.checked })
                    }
                    className="mt-0.5 text-sky-600 rounded"
                  />
                  <div>
                    <span className="text-sm text-slate-700">与厚度估算结果一致</span>
                    {!interpretForm.consistentWithThickness && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        不一致的结果会标记为待确认，需要进一步核查
                      </p>
                    )}
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">判读人</label>
                <input
                  type="text"
                  value={interpretForm.interpreter}
                  onChange={(e) =>
                    setInterpretForm({ ...interpretForm, interpreter: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">判读备注</label>
                <textarea
                  rows={3}
                  value={interpretForm.remark}
                  onChange={(e) =>
                    setInterpretForm({ ...interpretForm, remark: e.target.value })
                  }
                  placeholder="请输入判读说明..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowInterpretModal(false);
                  setSelectedSpectrum(null);
                }}
                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleInterpret}
                className="px-4 py-2 text-sm text-white bg-sky-600 rounded-md hover:bg-sky-700"
              >
                保存判读
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
