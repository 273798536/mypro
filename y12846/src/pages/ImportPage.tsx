import { useCallback, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Dna,
  FlaskConical,
  Download,
  Sparkles,
  Play,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileCode,
  FileSpreadsheet,
  HelpCircle,
  Thermometer,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import type { ReferenceSequence, PrimerPair, Mutation } from '../lib/utils/types';
import { parseFastaSync } from '../lib/parsers/fasta';
import { parsePrimersCsvSync, parseMutationsCsvSync } from '../lib/parsers/csv';
import { createPrimerPair, deduplicatePrimerPairs } from '../lib/bio/primer';
import { generateUniqueId } from '../lib/utils/hash';

interface UploadedFileInfo {
  name: string;
  size: number;
  type: 'reference' | 'primers' | 'mutations';
  count?: number;
  status: 'success' | 'error' | 'pending';
  error?: string;
}

const SAMPLE_FILES = {
  reference: 'sample_reference.fasta',
  primers: 'sample_primers.csv',
  mutations: 'sample_mutations.csv',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DragDropZoneProps {
  type: 'reference' | 'primers' | 'mutations';
  title: string;
  description: string;
  icon: typeof Dna;
  accept: string;
  fileInfo: UploadedFileInfo | null;
  onFile: (file: File) => void;
  onClear: () => void;
  onDownloadSample: () => void;
  sampleFileName: string;
}

function DragDropZone({
  type,
  title,
  description,
  icon: Icon,
  accept,
  fileInfo,
  onFile,
  onClear,
  onDownloadSample,
  sampleFileName,
}: DragDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const typeColor = {
    reference: 'border-brand-300 bg-brand-50 text-brand-700',
    primers: 'border-success-300 bg-success-50 text-success-700',
    mutations: 'border-warning-300 bg-warning-50 text-warning-700',
  }[type];

  const StatusIcon = fileInfo?.status === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <Icon className="h-4 w-4" />
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
        </div>
        <button
          onClick={onDownloadSample}
          className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 transition-colors"
        >
          <Download className="h-3 w-3" />
          样例文件
        </button>
      </div>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 transition-all duration-200',
          isDragging
            ? typeColor
            : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-neutral-600'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {!fileInfo ? (
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="h-8 w-8 text-neutral-400 mb-2" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              拖拽文件到此处，或点击选择
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              支持 {accept} 格式
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  type === 'reference' && 'bg-brand-100 text-brand-600',
                  type === 'primers' && 'bg-success-100 text-success-600',
                  type === 'mutations' && 'bg-warning-100 text-warning-600'
                )}
              >
                {type === 'reference' ? (
                  <FileCode className="h-5 w-5" />
                ) : (
                  <FileSpreadsheet className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {fileInfo.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <span className="text-neutral-500">{formatFileSize(fileInfo.size)}</span>
                  {fileInfo.count !== undefined && (
                    <Badge variant="default">{fileInfo.count} 条记录</Badge>
                  )}
                  {fileInfo.status === 'success' && (
                    <span className="inline-flex items-center gap-1 text-success-600">
                      <CheckCircle2 className="h-3 w-3" />
                      已加载
                    </span>
                  )}
                  {fileInfo.status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-danger-600">
                      <AlertCircle className="h-3 w-3" />
                      {fileInfo.error}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="rounded-lg p-1.5 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImportPage() {
  const {
    reference,
    primerPairs,
    mutations,
    config,
    loading,
    error,
    importWarnings,
    setReference,
    setConfig,
    addPrimerPairs,
    addMutations,
    clearData,
    loadSampleData,
    runAnalysis,
    setError,
    setImportWarnings,
  } = useAnalysisStore();

  const [referenceFile, setReferenceFile] = useState<UploadedFileInfo | null>(
    reference
      ? {
          name: reference.name + '.fasta',
          size: reference.sequence.length,
          type: 'reference',
          count: 1,
          status: 'success',
        }
      : null
  );
  const [primersFile, setPrimersFile] = useState<UploadedFileInfo | null>(
    primerPairs.length > 0
      ? {
          name: 'primers.csv',
          size: 0,
          type: 'primers',
          count: primerPairs.length,
          status: 'success',
        }
      : null
  );
  const [mutationsFile, setMutationsFile] = useState<UploadedFileInfo | null>(
    mutations.length > 0
      ? {
          name: 'mutations.csv',
          size: 0,
          type: 'mutations',
          count: mutations.length,
          status: 'success',
        }
      : null
  );

  const handleReferenceFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseFastaSync(content);
        const record = result.records[0];
        const ref: ReferenceSequence = {
          id: record.id,
          name: record.description || record.id,
          sequence: record.sequence,
          length: record.length,
          gcContent: record.gcContent,
        };
        setReference(ref);
        setReferenceFile({
          name: file.name,
          size: file.size,
          type: 'reference',
          count: result.recordCount,
          status: 'success',
        });
        setError(null);
      } catch (err) {
        setReferenceFile({
          name: file.name,
          size: file.size,
          type: 'reference',
          status: 'error',
          error: err instanceof Error ? err.message : '解析失败',
        });
      }
    };
    reader.readAsText(file);
  };

  const handlePrimersFile = (file: File) => {
    if (!reference) {
      setError('请先导入参考序列');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parsePrimersCsvSync(content);
        const pairs: PrimerPair[] = result.records.map((record) =>
          createPrimerPair(
            record.name,
            record.forwardSequence,
            record.reverseSequence,
            reference,
            config,
            record.batch
          )
        );
        const dedup = deduplicatePrimerPairs(pairs);
        addPrimerPairs(dedup.uniqueItems);
        setPrimersFile({
          name: file.name,
          size: file.size,
          type: 'primers',
          count: dedup.uniqueItems.length,
          status: 'success',
        });
        setError(null);
        if (result.warnings.length > 0) {
          setImportWarnings([...importWarnings, ...result.warnings.slice(0, 5)]);
        }
      } catch (err) {
        setPrimersFile({
          name: file.name,
          size: file.size,
          type: 'primers',
          status: 'error',
          error: err instanceof Error ? err.message : '解析失败',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleMutationsFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = parseMutationsCsvSync(content);
        const mutList: Mutation[] = result.records.map((record, idx) => ({
          id: generateUniqueId('m'),
          sampleId: `sample_${idx}_${record.sampleName.toLowerCase()}`,
          sampleName: record.sampleName,
          position: record.position,
          refBase: record.refBase,
          altBase: record.altBase,
          quality: record.quality,
          alleleFrequency: record.alleleFrequency,
        }));
        addMutations(mutList);
        setMutationsFile({
          name: file.name,
          size: file.size,
          type: 'mutations',
          count: mutList.length,
          status: 'success',
        });
        setError(null);
        if (result.warnings.length > 0) {
          setImportWarnings([...importWarnings, ...result.warnings.slice(0, 5)]);
        }
      } catch (err) {
        setMutationsFile({
          name: file.name,
          size: file.size,
          type: 'mutations',
          status: 'error',
          error: err instanceof Error ? err.message : '解析失败',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = (type: 'reference' | 'primers' | 'mutations') => {
    const filename = SAMPLE_FILES[type];
    fetch(`/${filename}`)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  };

  const handleLoadSampleData = async () => {
    await loadSampleData();
    setReferenceFile({
      name: SAMPLE_FILES.reference,
      size: 0,
      type: 'reference',
      status: 'success',
    });
    setPrimersFile({
      name: SAMPLE_FILES.primers,
      size: 0,
      type: 'primers',
      status: 'success',
    });
    setMutationsFile({
      name: SAMPLE_FILES.mutations,
      size: 0,
      type: 'mutations',
      status: 'success',
    });
  };

  const canAnalyze = reference !== null && primerPairs.length > 0;

  const previewPrimers = primerPairs.slice(0, 5);
  const previewMutations = mutations.slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">数据导入</h1>
          <p className="mt-1 text-sm text-neutral-500">
            上传参考序列、引物文件和突变数据，配置分析参数后开始分析
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={clearData}>
            <Trash2 className="h-4 w-4" />
            清空数据
          </Button>
          <Button variant="secondary" onClick={handleLoadSampleData} loading={loading}>
            <Sparkles className="h-4 w-4" />
            加载样例数据
          </Button>
          <Button onClick={runAnalysis} disabled={!canAnalyze} loading={loading}>
            <Play className="h-4 w-4" />
            开始分析
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-danger-200 bg-danger-50 p-4 text-danger-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">导入错误</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {importWarnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 p-4 text-warning-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">导入警告 ({importWarnings.length})</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {importWarnings.slice(0, 5).map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
              {importWarnings.length > 5 && (
                <li>• 还有 {importWarnings.length - 5} 条警告...</li>
              )}
            </ul>
          </div>
          <button
            onClick={() => setImportWarnings([])}
            className="text-xs hover:underline"
          >
            清除
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DragDropZone
          type="reference"
          title="参考序列 FASTA"
          description="病毒参考基因组序列，.fa/.fasta 格式"
          icon={Dna}
          accept=".fa,.fasta"
          fileInfo={referenceFile}
          onFile={handleReferenceFile}
          onClear={() => {
            setReference(null);
            setReferenceFile(null);
          }}
          onDownloadSample={() => handleDownloadSample('reference')}
          sampleFileName={SAMPLE_FILES.reference}
        />

        <DragDropZone
          type="primers"
          title="引物列表 CSV"
          description="包含名称、批次、正反向序列的引物文件"
          icon={FlaskConical}
          accept=".csv"
          fileInfo={primersFile}
          onFile={handlePrimersFile}
          onClear={() => {
            useAnalysisStore.getState().primerPairs.forEach((p) =>
              useAnalysisStore.getState().removePrimerPair(p.id)
            );
            setPrimersFile(null);
          }}
          onDownloadSample={() => handleDownloadSample('primers')}
          sampleFileName={SAMPLE_FILES.primers}
        />

        <DragDropZone
          type="mutations"
          title="突变数据 CSV/VCF"
          description="样本突变位点信息（可选）"
          icon={FileText}
          accept=".csv,.vcf"
          fileInfo={mutationsFile}
          onFile={handleMutationsFile}
          onClear={() => {
            mutations.forEach((m) => useAnalysisStore.getState().removeMutation(m.id));
            setMutationsFile(null);
          }}
          onDownloadSample={() => handleDownloadSample('mutations')}
          sampleFileName={SAMPLE_FILES.mutations}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-brand-500" />
            文件格式说明
          </CardTitle>
          <CardDescription>请确保上传文件符合以下格式要求</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Badge variant="info">FASTA 格式</Badge>
              <pre className="rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100 overflow-x-auto">
{`>NC_045512.2|SARS-CoV-2
ATTAAAGGTTTATACCTTCCCAGGTA...
TTAACCAATTCTCATTTTACTTACCG...`}
              </pre>
              <p className="text-xs text-neutral-500">标准 FASTA 格式，首行 &gt; 开头为序列 ID</p>
            </div>
            <div className="space-y-2">
              <Badge variant="success">引物 CSV 格式</Badge>
              <pre className="rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100 overflow-x-auto">
{`name,batch,forward_sequence,reverse_sequence,forward_tm,reverse_tm
PRIMER_001,B202401,ATGTTT...,CAATAG...,58.2,57.8`}
              </pre>
              <p className="text-xs text-neutral-500">6 列：名称、批次、正向、反向、正反向 Tm</p>
            </div>
            <div className="space-y-2">
              <Badge variant="warning">突变 CSV 格式</Badge>
              <pre className="rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100 overflow-x-auto">
{`sample_name,position,ref_base,alt_base,quality,allele_frequency
SAMPLE_A,125,T,C,352.5,0.85`}
              </pre>
              <p className="text-xs text-neutral-500">6 列：样本名、位置、参考碱基、替代碱基、质量、频率</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-brand-500" />
            分析参数配置
          </CardTitle>
          <CardDescription>调整引物评估的参数阈值</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Thermometer className="h-4 w-4 text-neutral-400" />
                最低退火温度 (°C)
              </label>
              <Input
                type="number"
                value={config.minTm}
                onChange={(e) => setConfig({ minTm: parseFloat(e.target.value) || 0 })}
                min={30}
                max={100}
              />
              <p className="text-xs text-neutral-500">引物最低可接受 Tm 值</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Thermometer className="h-4 w-4 text-neutral-400" />
                最高退火温度 (°C)
              </label>
              <Input
                type="number"
                value={config.maxTm}
                onChange={(e) => setConfig({ maxTm: parseFloat(e.target.value) || 0 })}
                min={30}
                max={100}
              />
              <p className="text-xs text-neutral-500">引物最高可接受 Tm 值</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Hash className="h-4 w-4 text-neutral-400" />
                3'端关键碱基数
              </label>
              <Input
                type="number"
                value={config.threePrimeCriticalBases}
                onChange={(e) => setConfig({ threePrimeCriticalBases: parseInt(e.target.value) || 0 })}
                min={1}
                max={15}
              />
              <p className="text-xs text-neutral-500">3'端范围内的错配视为关键错配</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <AlertTriangle className="h-4 w-4 text-neutral-400" />
                最大容忍错配数
              </label>
              <Input
                type="number"
                value={config.maxAllowedMismatches}
                onChange={(e) => setConfig({ maxAllowedMismatches: parseInt(e.target.value) || 0 })}
                min={0}
                max={20}
              />
              <p className="text-xs text-neutral-500">超过此数目的错配将标记为无效</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(primerPairs.length > 0 || mutations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-brand-500" />
              导入预览
            </CardTitle>
            <CardDescription>
              已导入 {primerPairs.length} 个引物对，{mutations.length} 个突变位点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {primerPairs.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    引物列表（显示前 5 条）
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">名称</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">批次</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">正向序列</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">反向序列</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Tm</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewPrimers.map((p) => (
                          <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800">
                            <td className="px-4 py-2 font-mono text-xs">{p.name}</td>
                            <td className="px-4 py-2 text-xs text-neutral-500">{p.batch || '-'}</td>
                            <td className="px-4 py-2 font-mono text-xs text-blue-600">{p.forward.sequence.slice(0, 15)}...</td>
                            <td className="px-4 py-2 font-mono text-xs text-purple-600">{p.reverse.sequence.slice(0, 15)}...</td>
                            <td className="px-4 py-2 font-mono text-xs">
                              {p.forward.tm.toFixed(1)} / {p.reverse.tm.toFixed(1)}
                            </td>
                            <td className="px-4 py-2">
                              <Badge
                                variant={
                                  p.status === 'valid'
                                    ? 'success'
                                    : p.status === 'warning'
                                    ? 'warning'
                                    : p.status === 'invalid'
                                    ? 'danger'
                                    : 'info'
                                }
                              >
                                {p.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {mutations.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    突变位点（显示前 5 条）
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">样本</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">位置</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">参考</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">替代</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">频率</th>
                          <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">质量</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewMutations.map((m) => (
                          <tr key={m.id} className="border-t border-neutral-100 dark:border-neutral-800">
                            <td className="px-4 py-2 font-mono text-xs">{m.sampleName}</td>
                            <td className="px-4 py-2 font-mono text-xs">{m.position}</td>
                            <td className="px-4 py-2">
                              <span className="font-mono text-xs font-semibold text-blue-600">{m.refBase}</span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="font-mono text-xs font-semibold text-danger-600">{m.altBase}</span>
                            </td>
                            <td className="px-4 py-2 font-mono text-xs">
                              {m.alleleFrequency !== undefined ? `${(m.alleleFrequency * 100).toFixed(1)}%` : '-'}
                            </td>
                            <td className="px-4 py-2 font-mono text-xs">
                              {m.quality !== undefined ? m.quality.toFixed(1) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
