import { useState, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Info,
  MapPin,
  FileText,
  Eye,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  User,
  Download,
  FileWarning,
  RefreshCw,
  PlayCircle,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import TimelineNode from '@/components/TimelineNode';
import { useWorkbenchStore, type UploadMaterialResult } from '@/store/workbenchStore';
import { anomalyTypeLabel, anomalyLevelLabel } from '@/store/taskStore';
import { cn } from '@/lib/utils';
import { formatFileSize, readFileAsText, readFileAsDataURL, downloadFile, getFileExtension, isTextParseableFile } from '@/utils/fileUtils';

export default function AnomalyDetail() {
  const selectedId = useWorkbenchStore(s => s.selectedAnomalyId);
  const allAnomalies = useWorkbenchStore(s => s.anomalies);
  const setSelected = useWorkbenchStore(s => s.setSelectedAnomalyId);
  const applyViewSnapshot = useWorkbenchStore(s => s.applyViewSnapshot);
  const saveViewSnapshot = useWorkbenchStore(s => s.saveViewSnapshot);
  const updateAnomalyStatus = useWorkbenchStore(s => s.updateAnomalyStatus);
  const addMaterialWithParse = useWorkbenchStore(s => s.addMaterialWithParse);
  const rerunCollisionCalculation = useWorkbenchStore(s => s.rerunCollisionCalculation);
  const viewSnapshots = useWorkbenchStore(s => s.viewSnapshots);
  const timeline = useWorkbenchStore(s => s.timeline);
  const isCalculating = useWorkbenchStore(s => s.isCalculating);
  const calcStats = useWorkbenchStore(s => s.calcStats);
  const lastCalculatedAt = useWorkbenchStore(s => s.lastCalculatedAt);

  const [remark, setRemark] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [matSource, setMatSource] = useState('');
  const [matRemark, setMatRemark] = useState('');
  const [isSupplement, setIsSupplement] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snapName, setSnapName] = useState('');
  const [showSaveSnap, setShowSaveSnap] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState(true);
  const [expandedSnapshots, setExpandedSnapshots] = useState(true);
  const [uploadResult, setUploadResult] = useState<UploadMaterialResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const anomaly = useMemo(
    () => (selectedId ? allAnomalies.find(a => a.id === selectedId) : undefined),
    [allAnomalies, selectedId],
  );
  const relatedSnaps = useMemo(
    () => viewSnapshots.filter(s => s.anomalyId === selectedId),
    [viewSnapshots, selectedId],
  );
  const relatedTimeline = useMemo(
    () => timeline.filter(t => t.anomalyId === selectedId),
    [timeline, selectedId],
  );

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadResult({
        success: false,
        errors: [`文件过大（${formatFileSize(file.size)}），最大支持 10 MB`],
        warnings: ['大文件建议先在CAD软件中简化后导出为GeoJSON格式'],
      });
      return;
    }

    const ext = getFileExtension(file.name);
    if (!['json', 'geojson', 'csv'].includes(ext)) {
      setUploadResult({
        success: false,
        errors: [`不支持的文件格式：.${ext || '（无扩展名）'}`],
        warnings: [
          '目前支持的文本解析格式：.json / .geojson / .csv',
          'DWG/DXF/SHP等二进制格式需先用CAD软件导出为GeoJSON或CSV后再上传',
        ],
      });
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRerun = useCallback(async () => {
    await rerunCollisionCalculation('阿乔');
  }, [rerunCollisionCalculation]);

  const handleDownloadMaterial = (mat: { name: string; fileData?: string }) => {
    if (mat.fileData) {
      downloadFile(mat.fileData, mat.name);
    }
  };

  if (!anomaly) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-primary-500/60 px-8 text-center">
        <Info size={36} className="mb-4 opacity-40" />
        <p className="text-sm">请从左侧列表或CAD画布中选择一处异常</p>
        <p className="text-xs mt-2 text-primary-500/40">
          选择后可查看异常详情、关联材料、视角快照和确认历史
        </p>
      </div>
    );
  }

  const handleConfirm = (status: 'confirmed_abnormal' | 'confirmed_normal') => {
    if (!remark.trim()) return;
    updateAnomalyStatus(anomaly.id, status, remark.trim(), '李工（负责人）');
    setRemark('');
  };

  const handleAddMaterial = async () => {
    if (!selectedFile || !anomaly) return;

    if (!isTextParseableFile(selectedFile.name)) {
      setUploadResult({
        success: false,
        errors: [`文件 "${selectedFile.name}" 不是可解析的文本格式`],
        warnings: ['请使用 .json / .geojson / .csv 格式'],
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const fileContent = await readFileAsText(selectedFile);

      if (!fileContent || fileContent.trim().length === 0) {
        setUploadResult({
          success: false,
          errors: ['文件内容为空'],
        });
        return;
      }

      const trimmed = fileContent.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.includes(',')) {
        setUploadResult({
          success: false,
          errors: ['文件内容格式无效，JSON文件应以"{"或"["开头'],
          warnings: [`文件前100字符：${trimmed.slice(0, 100)}`],
        });
        return;
      }

      let fileData = '';
      try {
        fileData = await readFileAsDataURL(selectedFile);
      } catch {
        const base64 = btoa(unescape(encodeURIComponent(fileContent)));
        fileData = `data:${selectedFile.type || 'application/octet-stream'};base64,${base64}`;
      }

      const result = await addMaterialWithParse(anomaly.id, selectedFile.name, fileContent, {
        isSupplement,
        source: matSource.trim() || '未注明来源',
        operator: '阿乔',
        remark: matRemark.trim(),
        fileSize: selectedFile.size,
        fileType: selectedFile.type || getFileExtension(selectedFile.name),
        fileData,
      });

      setUploadResult(result);

      if (result.success) {
        setSelectedFile(null);
        setMatSource('');
        setMatRemark('');
        setIsSupplement(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setUploadResult(null), 10000);
      }
    } catch (e) {
      setUploadResult({
        success: false,
        errors: [`文件读取失败：${e instanceof Error ? e.message : String(e)}`],
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSnapshot = () => {
    saveViewSnapshot(snapName.trim() || `${anomaly.wellName}-${new Date().toLocaleTimeString('zh-CN')}`, anomaly.id);
    setSnapName('');
    setShowSaveSnap(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary-700/30">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle size={16} className="text-danger shrink-0" />
          <h3 className="text-sm font-medium text-primary-100 truncate">{anomaly.wellName}</h3>
          <StatusBadge type="anomaly-level" value={anomaly.level} size="sm" />
        </div>
        <button
          onClick={() => setSelected(null)}
          className="text-primary-400 hover:text-primary-200 transition"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-primary-700/20 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-primary-400/60">基本信息</p>
              <StatusBadge type="anomaly-status" value={anomaly.status} size="sm" />
            </div>
            <p className="text-sm text-primary-50 leading-relaxed">{anomaly.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoRow icon={<FileText size={12} />} label="井编号" value={anomaly.wellId} />
            <InfoRow icon={<Layers size={12} />} label="类型" value={anomalyTypeLabel[anomaly.type]} />
            <InfoRow icon={<AlertCircle size={12} />} label="等级" value={anomalyLevelLabel[anomaly.level]} />
            <InfoRow icon={<MapPin size={12} />} label="坐标" value={`(${anomaly.position.x}, ${anomaly.position.y})`} />
          </div>

          {anomaly.conflictingObject && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg p-3">
              <p className="text-[11px] uppercase tracking-wider text-danger/70 mb-1">冲突对象</p>
              <p className="text-sm text-danger">{anomaly.conflictingObject}</p>
            </div>
          )}

          <div className="bg-dark-900/50 border border-primary-700/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-400/70 mb-1.5">
              <FileText size={11} />
              计算口径（本次检测使用）
            </div>
            <p className="text-xs text-primary-200 font-mono leading-relaxed">{anomaly.ruleSnapshot}</p>
          </div>

          {calcStats && (
            <div className="bg-primary-900/20 border border-primary-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary-400/70">
                  <RefreshCw size={11} />
                  当前碰撞统计
                </div>
                <button
                  onClick={handleRerun}
                  disabled={isCalculating}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-[10px] transition',
                    isCalculating
                      ? 'bg-primary-700/30 text-primary-400 cursor-not-allowed'
                      : 'bg-primary-600/20 text-primary-300 hover:bg-primary-600/30',
                  )}
                >
                  {isCalculating ? (
                    <>
                      <div className="w-2.5 h-2.5 border-1.5 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                      重算中...
                    </>
                  ) : (
                    <>
                      <PlayCircle size={11} />
                      重跑碰撞检测
                    </>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-danger/10 rounded py-1.5">
                  <p className="text-sm font-bold text-danger">{calcStats.high}</p>
                  <p className="text-[9px] text-danger/70">高风险</p>
                </div>
                <div className="bg-warning/10 rounded py-1.5">
                  <p className="text-sm font-bold text-warning">{calcStats.medium}</p>
                  <p className="text-[9px] text-warning/70">中风险</p>
                </div>
                <div className="bg-info/10 rounded py-1.5">
                  <p className="text-sm font-bold text-info">{calcStats.low}</p>
                  <p className="text-[9px] text-info/70">低风险</p>
                </div>
              </div>
              {lastCalculatedAt && (
                <p className="text-[10px] text-primary-500/60 mt-2 text-center">
                  上次计算：{lastCalculatedAt}
                </p>
              )}
            </div>
          )}
        </div>

        {anomaly.status === 'unconfirmed' && (
          <div className="p-4 border-b border-primary-700/20">
            <p className="text-[11px] uppercase tracking-wider text-primary-400/70 mb-2">人工确认</p>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="填写确认意见（必填）——社区公示前复盘时会展示给负责人"
              className="w-full px-3 py-2 rounded-md bg-dark-900/60 border border-primary-700/40 text-sm text-primary-100 placeholder-primary-500/50 focus:border-primary-500 focus:outline-none transition resize-none min-h-[72px]"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => handleConfirm('confirmed_normal')}
                disabled={!remark.trim()}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5',
                  remark.trim()
                    ? 'bg-success/15 text-success border border-success/40 hover:bg-success/25'
                    : 'bg-dark-900/40 text-primary-500 border border-primary-700/30 cursor-not-allowed',
                )}
              >
                <CheckCircle2 size={15} />
                确认为正常
              </button>
              <button
                onClick={() => handleConfirm('confirmed_abnormal')}
                disabled={!remark.trim()}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5',
                  remark.trim()
                    ? 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25'
                    : 'bg-dark-900/40 text-primary-500 border border-primary-700/30 cursor-not-allowed',
                )}
              >
                <XCircle size={15} />
                确认为异常
              </button>
            </div>
          </div>
        )}

        <Section
          title="关联CAD图层 / 材料"
          count={anomaly.materials.length}
          expanded={expandedMaterials}
          onToggle={() => setExpandedMaterials(v => !v)}
        >
          <div className="space-y-2 mb-4">
            {anomaly.materials.length === 0 ? (
              <p className="text-xs text-primary-500/60 py-2">暂无关联材料</p>
            ) : (
              anomaly.materials.map(mat => (
                <div key={mat.id} className="rounded-lg border border-primary-700/20 bg-dark-900/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Layers size={13} className="text-primary-400 shrink-0" />
                        <span className="text-sm text-primary-100 truncate">{mat.name}</span>
                        {mat.version && !mat.isSupplement && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary-600/30 text-primary-300 border border-primary-500/40 shrink-0">
                            v{mat.version}
                          </span>
                        )}
                        {mat.isSupplement && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-warning/15 text-warning border border-warning/40 shrink-0">
                            后补·不覆盖
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-primary-400/70 flex-wrap">
                        {mat.fileSize !== undefined && (
                          <span>{formatFileSize(mat.fileSize)}</span>
                        )}
                        {mat.fileSize !== undefined && <span>·</span>}
                        <span>{mat.source}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><User size={10} />{mat.operator}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{mat.uploadedAt}</span>
                      </div>
                      {mat.remark && (
                        <p className="mt-2 text-xs text-primary-300/80 leading-relaxed">{mat.remark}</p>
                      )}
                    </div>
                    {mat.fileData && (
                      <button
                        onClick={() => handleDownloadMaterial(mat)}
                        className="shrink-0 p-1.5 rounded text-primary-400 hover:text-primary-200 hover:bg-primary-700/20 transition"
                        title="下载文件"
                      >
                        <Download size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-dark-900/30 rounded-lg p-3 border border-primary-700/20">
            <p className="text-xs text-primary-200 mb-2 flex items-center gap-1.5">
              <Upload size={12} />
              补录CAD材料
            </p>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".json,.geojson,.csv"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
                  isDragging
                    ? 'border-primary-500 bg-primary-500/10'
                    : selectedFile
                    ? 'border-primary-500/50 bg-primary-500/5'
                    : 'border-primary-700/40 hover:border-primary-600/60 hover:bg-primary-700/5',
                )}
              >
                {selectedFile ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <FileText size={16} className="text-primary-400" />
                      <span className="text-xs text-primary-100 font-medium truncate max-w-[180px]">
                        {selectedFile.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-primary-400/70">
                      {formatFileSize(selectedFile.size)} · {selectedFile.type || getFileExtension(selectedFile.name)}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-[11px] text-danger hover:text-danger/80 mt-1"
                    >
                      移除文件
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload size={20} className="mx-auto text-primary-500/60" />
                    <p className="text-xs text-primary-400">点击或拖拽文件到此处</p>
                    <p className="text-[10px] text-primary-500/50">支持 .json / .geojson / .csv 格式（CAD图层文本）</p>
                  </div>
                )}
              </div>

              <input
                value={matSource}
                onChange={(e) => setMatSource(e.target.value)}
                placeholder="来源（可选，如：轨道公司补充提供）"
                className="w-full px-3 py-1.5 rounded text-xs bg-dark-900/60 border border-primary-700/40 text-primary-100 placeholder-primary-500/50 focus:border-primary-500 focus:outline-none"
              />
              <textarea
                value={matRemark}
                onChange={(e) => setMatRemark(e.target.value)}
                placeholder="备注：说明与原判断的关系"
                className="w-full px-3 py-1.5 rounded text-xs bg-dark-900/60 border border-primary-700/40 text-primary-100 placeholder-primary-500/50 focus:border-primary-500 focus:outline-none resize-none min-h-[52px]"
              />
              <label className="flex items-center gap-2 text-xs text-primary-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSupplement}
                  onChange={(e) => setIsSupplement(e.target.checked)}
                  className="rounded border-primary-600 bg-dark-900 text-primary-500 focus:ring-primary-500"
                />
                标记为后补材料（不覆盖原判断结论，留痕记录）
              </label>
              {!isSupplement && (
                <div className="flex items-start gap-1.5 p-2 rounded bg-warning/10 border border-warning/30">
                  <FileWarning size={12} className="text-warning shrink-0 mt-0.5" />
                  <p className="text-[10px] text-warning/80 leading-relaxed">
                    非后补材料将作为新版本图层，可能影响后续碰撞计算结果。如仅为复核参考，请勾选"后补材料"。
                  </p>
                </div>
              )}
              <button
                onClick={handleAddMaterial}
                disabled={!selectedFile || uploading || isCalculating}
                className={cn(
                  'w-full px-3 py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1.5',
                  selectedFile && !uploading && !isCalculating
                    ? 'bg-primary-600/30 text-primary-100 border border-primary-500/40 hover:bg-primary-600/40'
                    : 'bg-dark-900/40 text-primary-500 border border-primary-700/30 cursor-not-allowed',
                )}
              >
                {uploading || isCalculating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                    {isCalculating ? '解析并重算中...' : '上传中...'}
                  </>
                ) : (
                  <>
                    <Upload size={12} />
                    上传、解析并重算
                  </>
                )}
              </button>

              {uploadResult && (
                <div className={cn(
                  'rounded-lg p-3 mt-3 border',
                  uploadResult.success
                    ? 'bg-success/10 border-success/30'
                    : 'bg-danger/10 border-danger/30',
                )}>
                  <p className={cn(
                    'text-xs font-medium mb-2 flex items-center gap-1.5',
                    uploadResult.success ? 'text-success' : 'text-danger',
                  )}>
                    {uploadResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {uploadResult.success ? '解析并上传成功' : '上传失败'}
                  </p>
                  {uploadResult.success && uploadResult.parseResult?.layer && (
                    <div className="text-[11px] text-primary-200 space-y-1">
                      <p>解析到：{uploadResult.parseResult.layer.featureCount.wells} 口井、{uploadResult.parseResult.layer.featureCount.obstacles} 个障碍</p>
                      {uploadResult.recalcResult?.changes && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {uploadResult.recalcResult.changes.added > 0 && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-danger/15 text-danger rounded">
                              <PlusCircle size={10} /> 新增{uploadResult.recalcResult.changes.added}处
                            </span>
                          )}
                          {uploadResult.recalcResult.changes.removed > 0 && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-success/15 text-success rounded">
                              <MinusCircle size={10} /> 解除{uploadResult.recalcResult.changes.removed}处
                            </span>
                          )}
                          {uploadResult.recalcResult.changes.upgraded > 0 && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-danger/15 text-danger rounded">
                              <TrendingUp size={10} /> 升级{uploadResult.recalcResult.changes.upgraded}处
                            </span>
                          )}
                          {uploadResult.recalcResult.changes.downgraded > 0 && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-info/15 text-info rounded">
                              <TrendingDown size={10} /> 降级{uploadResult.recalcResult.changes.downgraded}处
                            </span>
                          )}
                          {uploadResult.recalcResult.changes.unchanged > 0 && uploadResult.recalcResult.changes.added === 0 && uploadResult.recalcResult.changes.removed === 0 && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-600/20 text-primary-300 rounded">
                              {uploadResult.recalcResult.changes.unchanged}处无变化
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {uploadResult.warnings && uploadResult.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadResult.warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-warning/80 flex items-start gap-1">
                          <AlertCircle size={10} className="shrink-0 mt-0.5" />
                          {w}
                        </p>
                      ))}
                    </div>
                  )}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadResult.errors.map((e, i) => (
                        <p key={i} className="text-[10px] text-danger/80">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section
          title="视角快照"
          count={relatedSnaps.length}
          expanded={expandedSnapshots}
          onToggle={() => setExpandedSnapshots(v => !v)}
        >
          {!showSaveSnap ? (
            <button
              onClick={() => setShowSaveSnap(true)}
              className="w-full mb-3 px-3 py-2 rounded-md text-xs bg-primary-600/20 text-primary-200 border border-primary-500/40 hover:bg-primary-600/30 transition flex items-center justify-center gap-1.5"
            >
              <Eye size={13} />
              保存当前CAD视图为快照
            </button>
          ) : (
            <div className="mb-3 bg-dark-900/30 rounded-lg p-3 border border-primary-700/20 space-y-2">
              <input
                value={snapName}
                onChange={(e) => setSnapName(e.target.value)}
                placeholder="快照名称（建议标明用途）"
                className="w-full px-3 py-1.5 rounded text-xs bg-dark-900/60 border border-primary-700/40 text-primary-100 placeholder-primary-500/50 focus:border-primary-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveSnap(false)}
                  className="flex-1 px-3 py-1.5 rounded text-xs text-primary-400 hover:text-primary-200 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveSnapshot}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-primary-600/30 text-primary-100 border border-primary-500/40 hover:bg-primary-600/40 transition"
                >
                  保存
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {relatedSnaps.length === 0 ? (
              <p className="text-xs text-primary-500/60 py-2">暂无保存的视角快照</p>
            ) : (
              relatedSnaps.map(snap => (
                <button
                  key={snap.id}
                  onClick={() => applyViewSnapshot(snap.id)}
                  className="w-full text-left rounded-lg border border-primary-700/20 bg-dark-900/40 p-3 hover:border-primary-600/50 hover:bg-dark-900/60 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Eye size={13} className="text-primary-400" />
                    <span className="text-sm text-primary-100">{snap.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-primary-400/70">
                    <span>缩放 {snap.viewState.scale.toFixed(1)}x</span>
                    <span>·</span>
                    <span>{snap.createdAt}</span>
                    <span>·</span>
                    <span>{snap.operator}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-primary-300/60">
                    点击恢复此视图条件 · 可用于负责人复核时截图
                  </p>
                </button>
              ))
            )}
          </div>
        </Section>

        <Section
          title="确认历史 / 变更记录"
          count={relatedTimeline.length}
          expanded={expandedHistory}
          onToggle={() => setExpandedHistory(v => !v)}
        >
          {anomaly.confirmHistory.length === 0 && relatedTimeline.length === 0 ? (
            <p className="text-xs text-primary-500/60 py-2">暂无变更记录</p>
          ) : (
            <div>
              {relatedTimeline.length > 0 && (
                <div className="mb-4">
                  {relatedTimeline.map((e, i) => (
                    <TimelineNode
                      key={e.id}
                      event={e}
                      isLast={i === relatedTimeline.length - 1 && anomaly.confirmHistory.length === 0}
                    />
                  ))}
                </div>
              )}
              {anomaly.confirmHistory.length > 0 && (
                <div className="space-y-3">
                  {anomaly.confirmHistory.map(rec => (
                    <div key={rec.id} className="rounded-lg border border-primary-700/20 bg-dark-900/40 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="anomaly-status" value={rec.fromStatus} size="sm" />
                          <span className="text-primary-500 text-xs">→</span>
                          <StatusBadge type="anomaly-status" value={rec.toStatus} size="sm" />
                        </div>
                        <span className="text-[11px] text-primary-400/70">{rec.timestamp}</span>
                      </div>
                      <p className="text-sm text-primary-200 leading-relaxed">{rec.remark}</p>
                      <div className="mt-2 text-[11px] text-primary-400/70 flex items-center gap-1.5">
                        <User size={10} />
                        {rec.operator}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-primary-500/60">{icon}</span>
      <span className="text-primary-400/70">{label}:</span>
      <span className="text-primary-100 truncate">{value}</span>
    </div>
  );
}

function Section({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-primary-700/20">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-700/5 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-primary-200 font-medium">{title}</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary-700/30 text-primary-300">
            {count}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={15} className="text-primary-400" />
        ) : (
          <ChevronDown size={15} className="text-primary-400" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
