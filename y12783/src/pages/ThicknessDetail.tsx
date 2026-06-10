import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDate, formatDateShort } from '../../shared/utils/calculate';
import { calculateThickness } from '../../shared/utils/calculate';
import {
  ArrowLeft,
  Calculator,
  AlertTriangle,
  CheckCircle,
  Clock,
  History,
  Layers,
  Zap,
  FileText,
} from 'lucide-react';
import type { ThicknessRecord, Batch } from '../../shared/types';

export function ThicknessDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { currentBatchThickness, fetchBatchThickness } = useAppStore();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    wavelength: 632.8,
    refractiveIndex: 1.457,
    reflectance: 0.185,
    transmittance: undefined as number | undefined,
    operator: '管理员',
    remark: '',
    blankControlComplete: true,
    useTransmittance: false,
  });
  const [previewResult, setPreviewResult] = useState<{
    thicknessNm: number;
    confidenceMin: number;
    confidenceMax: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!batchId) return;

    setLoading(true);
    Promise.all([
      fetch('/api/batches/' + batchId).then((r) => r.json()),
      fetchBatchThickness(batchId),
    ])
      .then(([batchData]) => {
        setBatch(batchData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batchId, fetchBatchThickness]);

  useEffect(() => {
    const params: any = {
      wavelength: formData.wavelength,
      refractiveIndex: formData.refractiveIndex,
    };
    if (formData.useTransmittance && formData.transmittance !== undefined) {
      params.transmittance = formData.transmittance;
    } else if (!formData.useTransmittance && formData.reflectance !== undefined) {
      params.reflectance = formData.reflectance;
    }

    const result = calculateThickness(
      params,
      formData.blankControlComplete ? 'standard' : 'degraded_cli',
      formData.blankControlComplete
    );
    setPreviewResult(result);
  }, [formData]);

  const handleSave = async () => {
    if (!batchId) return;

    setSaving(true);
    try {
      const parameters: any = {
        wavelength: formData.wavelength,
        refractiveIndex: formData.refractiveIndex,
      };
      if (formData.useTransmittance) {
        parameters.transmittance = formData.transmittance;
      } else {
        parameters.reflectance = formData.reflectance;
      }

      const status = formData.blankControlComplete ? 'pass' : 'pending';

      await useAppStore.getState().addThicknessRecord(batchId, {
        parameters,
        algorithm: formData.blankControlComplete ? 'standard' : 'degraded_cli',
        blankControlComplete: formData.blankControlComplete,
        operator: formData.operator,
        status,
        remark: formData.remark,
        source: 'web',
      });

      alert('保存成功！');
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">批次不存在</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-sky-600 hover:text-sky-700"
        >
          返回批次追踪
        </button>
      </div>
    );
  }

  const latestRecord = currentBatchThickness[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-slate-600 hover:text-slate-800 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回批次追踪
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              {batch.materialName}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
              <span>批次号：<span className="font-mono text-slate-700">{batch.batchNo}</span></span>
              <span>材料编号：<span className="font-mono text-slate-700">{batch.materialNo}</span></span>
              <span>衬底：{batch.substrateType}</span>
              <span>镀层：{batch.coatingType}</span>
              <span>操作员：{batch.operator}</span>
            </div>
          </div>
          <StatusBadge status={batch.status} type="batch" />
        </div>

        {batch.remark && (
          <div className="mt-4 p-3 bg-slate-50 rounded-md text-sm text-slate-600">
            <FileText className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            备注：{batch.remark}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-sky-600" />
              厚度估算参数
            </h2>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">波长 (nm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.wavelength}
                  onChange={(e) => setFormData({ ...formData, wavelength: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">折射率</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.refractiveIndex}
                  onChange={(e) => setFormData({ ...formData, refractiveIndex: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.useTransmittance}
                    onChange={() => setFormData({ ...formData, useTransmittance: false })}
                    className="text-sky-600"
                  />
                  <span className="text-sm text-slate-600">反射率</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.useTransmittance}
                    onChange={() => setFormData({ ...formData, useTransmittance: true })}
                    className="text-sky-600"
                  />
                  <span className="text-sm text-slate-600">透射率</span>
                </label>
              </div>
              <input
                type="number"
                step="0.001"
                value={formData.useTransmittance ? formData.transmittance ?? '' : formData.reflectance ?? ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (formData.useTransmittance) {
                    setFormData({ ...formData, transmittance: val });
                  } else {
                    setFormData({ ...formData, reflectance: val });
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.blankControlComplete}
                  onChange={(e) => setFormData({ ...formData, blankControlComplete: e.target.checked })}
                  className="mt-0.5 text-sky-600 rounded"
                />
                <div>
                  <span className="text-sm text-slate-700">空白对照数据完整</span>
                  {!formData.blankControlComplete && (
                    <p className="text-xs text-amber-600 mt-0.5 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      空白对照缺失，将使用降级算法，置信区间较宽
                    </p>
                  )}
                </div>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">操作员</label>
                <input
                  type="text"
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">备注</label>
              <textarea
                rows={2}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 text-white text-sm font-medium bg-sky-600 rounded-md hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '执行估算并保存'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-medium text-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" />
                实时估算预览
              </h2>
            </div>

            <div className="p-5">
              {previewResult && (
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-800 tracking-tight">
                    {previewResult.thicknessNm}
                    <span className="text-lg font-normal text-slate-500 ml-1">nm</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    置信区间：
                    <span className="font-mono text-slate-700">
                      [{previewResult.confidenceMin}, {previewResult.confidenceMax}]
                    </span>
                    <span className="ml-2">
                      (±{((previewResult.confidenceMax - previewResult.thicknessNm) / previewResult.thicknessNm * 100).toFixed(1)}%)
                    </span>
                  </div>

                  {!formData.blankControlComplete && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-left">
                      <p className="text-sm text-amber-700 flex items-start">
                        <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>
                          当前使用<strong>降级算法</strong>（空白对照缺失），结果仅供参考。
                          建议使用 CLI 工具进行专项处理。
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">算法</p>
                      <p className="text-slate-700 font-medium">
                        {formData.blankControlComplete ? '标准算法' : '降级算法'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">数据来源</p>
                      <p className="text-slate-700 font-medium">Web 界面</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {latestRecord && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-medium text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  最新估算结果
                </h2>
                <span className="text-xs text-slate-400">版本 v{latestRecord.version}</span>
              </div>
              <div className="p-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-slate-800">
                    {latestRecord.thicknessNm}
                  </span>
                  <span className="text-sm text-slate-500">nm</span>
                  <StatusBadge status={latestRecord.status} type="result" />
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  置信区间：[{latestRecord.confidenceMin}, {latestRecord.confidenceMax}]
                </div>
                <div className="mt-3 text-xs text-slate-400">
                  操作员：{latestRecord.operator} · {formatDate(latestRecord.createdAt)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-medium text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600" />
            估算历史
            <span className="text-xs font-normal text-slate-400 ml-2">
              共 {currentBatchThickness.length} 条记录，版本递增，避免重复结论
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">版本</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">算法</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">空白对照</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">厚度 (nm)</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">置信区间</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">来源</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">状态</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">操作员</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentBatchThickness.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    暂无估算记录
                  </td>
                </tr>
              ) : (
                currentBatchThickness.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">v{record.version}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {record.algorithm === 'standard' ? '标准算法' : '降级算法'}
                    </td>
                    <td className="px-4 py-3">
                      {record.blankControlComplete ? (
                        <span className="text-emerald-600">完整</span>
                      ) : (
                        <span className="text-amber-600">缺失</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {record.thicknessNm}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                      [{record.confidenceMin}, {record.confidenceMax}]
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        record.source === 'web'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-violet-50 text-violet-700'
                      }`}>
                        {record.source === 'web' ? 'Web' : 'CLI'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} type="result" />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{record.operator}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatDateShort(record.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
