import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  ArrowRight,
  Download,
  Plus,
  X,
} from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { parseCsvFile, exportSamplesToCsv, downloadCsv } from '@/utils/csv';
import type { ModelVersion } from '@/types';
import { generateId } from '@/utils/format';

export function ImportPage() {
  const navigate = useNavigate();
  const { session, importModelVersion } = useReviewStore();
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>(
    'upload',
  );
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [versionName, setVersionName] = useState('');
  const [versionDesc, setVersionDesc] = useState('');
  const [productIdCol, setProductIdCol] = useState('');
  const [productNameCol, setProductNameCol] = useState('');
  const [attributeMappings, setAttributeMappings] = useState<
    { csvColumn: string; attributeName: string }[]
  >([]);
  const [newAttrCol, setNewAttrCol] = useState('');
  const [newAttrName, setNewAttrName] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].name.endsWith('.csv')) {
        await handleFile(files[0]);
      }
    },
    [],
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setFile(file);
    const { data, headers: hdrs } = await parseCsvFile(file);
    setCsvData(data.slice(0, 50));
    setHeaders(hdrs);
    setStep('mapping');

    if (hdrs.length > 0) {
      setProductIdCol(hdrs.find((h) => /id|编号|sku/i.test(h)) || hdrs[0]);
      setProductNameCol(
        hdrs.find((h) => /name|名称|商品|产品/i.test(h)) || hdrs[1],
      );

      const attrCandidates = hdrs.filter(
        (h) => !/id|name|名称|编号|sku|置信|confidence/i.test(h),
      );
      if (attrCandidates.length > 0) {
        setAttributeMappings(
          attrCandidates.slice(0, 5).map((col) => ({
            csvColumn: col,
            attributeName: col,
          })),
        );
      }
    }

    const baseName = file.name.replace('.csv', '');
    setVersionName(baseName);
    setVersionDesc(`从 ${file.name} 导入`);
  };

  const addAttributeMapping = () => {
    if (newAttrCol && newAttrName) {
      setAttributeMappings([
        ...attributeMappings,
        { csvColumn: newAttrCol, attributeName: newAttrName },
      ]);
      setNewAttrCol('');
      setNewAttrName('');
    }
  };

  const removeAttributeMapping = (index: number) => {
    setAttributeMappings(attributeMappings.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    const newVersion: Omit<ModelVersion, 'id' | 'importedAt'> & {
      isBaseline?: boolean;
    } = {
      name: versionName,
      description: versionDesc,
      isBaseline: session.modelVersions.length === 0,
    };

    const samples = csvData.map((row) => {
      const sampleId = generateId('sample');
      const attributes: Record<string, import('@/types').AttributeOutput> = {};

      attributeMappings.forEach(({ csvColumn, attributeName }) => {
        const value = row[csvColumn] || '';
        attributes[attributeName] = {
          name: attributeName,
          versions: {
            [generateId('temp')]: {
              value,
              confidence: 0.7,
              evidence: `从CSV导入`,
            },
          },
        };
      });

      return {
        id: sampleId,
        productId: row[productIdCol] || generateId('prod'),
        productName: row[productNameCol] || '未命名商品',
        imageUrl: '',
        category: '',
        isBoundary: false,
        reviewStatus: 'pending' as const,
        attributes,
        notes: [],
        leakRisk: 'none' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    });

    importModelVersion(newVersion, samples, '当前用户');
    setStep('done');
  };

  const handleExport = () => {
    const content = exportSamplesToCsv(
      session.samples,
      session.modelVersions,
      {
        includeConfidence: true,
        includeNotes: true,
      },
    );
    downloadCsv(content, `复核明细_${new Date().toLocaleDateString('zh-CN')}.csv`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-slate-700/50 glass-strong">
        <h2 className="font-display text-xl font-bold text-white">
          数据导入导出
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          导入模型输出CSV，导出复核明细
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-accent/20 flex items-center justify-center">
                  <Download size={20} className="text-cyan-accent" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200">
                    导出复核明细
                  </h3>
                  <p className="text-xs text-slate-400">
                    导出当前会话的所有样本及复核结果
                  </p>
                </div>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-accent/20 hover:bg-cyan-accent/30 text-cyan-accent text-sm font-medium rounded-lg transition-colors"
              >
                <Download size={16} />
                导出CSV
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xl font-bold text-slate-200">
                  {session.samples.length}
                </div>
                <div className="text-xs text-slate-500">样本数</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xl font-bold text-slate-200">
                  {session.modelVersions.length}
                </div>
                <div className="text-xs text-slate-500">模型版本</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50">
                <div className="text-xl font-bold text-slate-200">
                  {session.history.length}
                </div>
                <div className="text-xs text-slate-500">操作记录</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-700/50" />
            <span className="text-xs text-slate-500">或</span>
            <div className="flex-1 h-px bg-slate-700/50" />
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-400/20 flex items-center justify-center">
                <Upload size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200">
                  导入模型输出
                </h3>
                <p className="text-xs text-slate-400">
                  上传CSV文件，配置列映射，导入新版本
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              {['上传文件', '列映射', '预览确认', '完成'].map((label, i) => {
                const stepIndex = ['upload', 'mapping', 'preview', 'done'].indexOf(
                  step,
                );
                const isActive = i <= stepIndex;
                return (
                  <div key={label} className="flex items-center flex-1">
                    <div
                      className={`flex items-center gap-2 ${
                        isActive ? 'text-cyan-accent' : 'text-slate-500'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isActive
                            ? 'bg-cyan-accent/20 text-cyan-accent'
                            : 'bg-slate-700 text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span className="text-xs">{label}</span>
                    </div>
                    {i < 3 && (
                      <div
                        className={`flex-1 h-px mx-2 ${
                          isActive && i < stepIndex
                            ? 'bg-cyan-accent'
                            : 'bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {step === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragging
                    ? 'border-cyan-accent bg-cyan-accent/5'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <Upload
                  size={48}
                  className={`mx-auto mb-4 ${
                    isDragging ? 'text-cyan-accent' : 'text-slate-500'
                  }`}
                />
                <p className="text-slate-300 mb-2">拖拽CSV文件到这里</p>
                <p className="text-sm text-slate-500 mb-4">
                  或点击下方按钮选择文件
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-accent/20 hover:bg-cyan-accent/30 text-cyan-accent text-sm font-medium rounded-lg cursor-pointer transition-colors">
                  <FileText size={16} />
                  选择文件
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {step === 'mapping' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      版本名称
                    </label>
                    <input
                      type="text"
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-accent/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      版本描述
                    </label>
                    <input
                      type="text"
                      value={versionDesc}
                      onChange={(e) => setVersionDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-accent/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      商品ID列
                    </label>
                    <select
                      value={productIdCol}
                      onChange={(e) => setProductIdCol(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-accent/50"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      商品名称列
                    </label>
                    <select
                      value={productNameCol}
                      onChange={(e) => setProductNameCol(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-accent/50"
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-slate-400">属性列映射</label>
                  </div>

                  <div className="space-y-2">
                    {attributeMappings.map((mapping, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 bg-slate-800/30 rounded-lg"
                      >
                        <select
                          value={mapping.csvColumn}
                          onChange={(e) => {
                            const updated = [...attributeMappings];
                            updated[i].csvColumn = e.target.value;
                            setAttributeMappings(updated);
                          }}
                          className="flex-1 px-2 py-1.5 text-xs bg-slate-900/50 border border-slate-700 rounded text-slate-200"
                        >
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <ArrowRight size={14} className="text-slate-500" />
                        <input
                          type="text"
                          value={mapping.attributeName}
                          onChange={(e) => {
                            const updated = [...attributeMappings];
                            updated[i].attributeName = e.target.value;
                            setAttributeMappings(updated);
                          }}
                          className="flex-1 px-2 py-1.5 text-xs bg-slate-900/50 border border-slate-700 rounded text-slate-200"
                        />
                        <button
                          onClick={() => removeAttributeMapping(i)}
                          className="p-1 text-slate-500 hover:text-rose-alert"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <select
                      value={newAttrCol}
                      onChange={(e) => setNewAttrCol(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs bg-slate-800/50 border border-slate-700 rounded text-slate-400"
                    >
                      <option value="">选择CSV列...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newAttrName}
                      onChange={(e) => setNewAttrName(e.target.value)}
                      placeholder="属性名称"
                      className="flex-1 px-2 py-1.5 text-xs bg-slate-800/50 border border-slate-700 rounded text-slate-300 placeholder-slate-500"
                    />
                    <button
                      onClick={addAttributeMapping}
                      disabled={!newAttrCol || !newAttrName}
                      className="p-1.5 text-cyan-accent hover:bg-cyan-accent/10 rounded disabled:opacity-30"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300"
                  >
                    返回
                  </button>
                  <button
                    onClick={() => setStep('preview')}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-accent/20 hover:bg-cyan-accent/30 text-cyan-accent text-sm font-medium rounded-lg"
                  >
                    预览
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-cyan-accent/10 border border-cyan-accent/30">
                  <div className="flex items-center gap-2 text-sm text-cyan-accent">
                    <CheckCircle size={16} />
                    <span>
                      即将导入 <strong>{csvData.length}</strong> 条样本，{' '}
                      <strong>{attributeMappings.length}</strong> 个属性
                    </span>
                  </div>
                </div>

                <div className="border border-slate-700/50 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-800 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-400 font-medium">
                            #
                          </th>
                          {attributeMappings.map((m) => (
                            <th
                              key={m.csvColumn}
                              className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap"
                            >
                              {m.attributeName}
                              <div className="text-[10px] text-slate-500">
                                ({m.csvColumn})
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {csvData.slice(0, 10).map((row, i) => (
                          <tr key={i} className="hover:bg-slate-700/30">
                            <td className="px-3 py-2 text-slate-500">
                              {i + 1}
                            </td>
                            {attributeMappings.map((m) => (
                              <td
                                key={m.csvColumn}
                                className="px-3 py-2 text-slate-300"
                              >
                                {row[m.csvColumn] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setStep('mapping')}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300"
                  >
                    返回修改
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg"
                  >
                    <Upload size={16} />
                    确认导入
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-400/20 flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  导入成功
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  成功导入 {csvData.length} 条样本数据到新版本「{versionName}」
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setStep('upload');
                      setFile(null);
                      setCsvData([]);
                    }}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300"
                  >
                    继续导入
                  </button>
                  <button
                    onClick={() => navigate('/workbench')}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-accent/20 hover:bg-cyan-accent/30 text-cyan-accent text-sm font-medium rounded-lg"
                  >
                    前往复核
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
