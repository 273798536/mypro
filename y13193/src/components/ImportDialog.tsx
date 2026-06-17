import { useState, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  FileJson,
  Edit3,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Thermometer,
  Battery,
  Tag,
  Clock
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import {
  parseBatteryJsonFile,
  mergeImageFilesAsSamples,
  buildSampleFromForm,
  createJsonImportTemplate,
  validateParameterSets
} from '../utils/fileIO';
import type { BatterySample, SampleType, ImportWarning } from '../types';

type Tab = 'json' | 'photo' | 'manual';

export function ImportDialog() {
  const {
    importDialogVisible,
    lastImportWarnings,
    actions: {
      setImportDialogVisible,
      addSamples,
      importParameterSets,
      setLastImportWarnings
    }
  } = useAppStore();

  const [tab, setTab] = useState<Tab>('json');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [warnings, setWarnings] = useState<ImportWarning[]>([]);
  const [successInfo, setSuccessInfo] = useState<{ count: number; type: string } | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setWarnings([]);
    setSuccessInfo(null);
    setIsProcessing(false);
  };

  const close = () => {
    resetState();
    setImportDialogVisible(false);
  };

  const handleJsonFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setWarnings([]);
    setSuccessInfo(null);

    let allWarnings: ImportWarning[] = [];
    let sampleCount = 0;
    let paramCount = 0;

    for (let i = 0; i < files.length; i++) {
      const result = await parseBatteryJsonFile(files[i]);
      allWarnings = [...allWarnings, ...result.warnings];

      if (result.samples.length > 0) {
        addSamples(result.samples, `导入文件 ${files[i].name}`);
        sampleCount += result.samples.length;
      }

      try {
        const text = await files[i].text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && 'parameterSets' in parsed) {
          const sets = validateParameterSets((parsed as { parameterSets: unknown }).parameterSets);
          if (sets && sets.length > 0) {
            importParameterSets(sets, `导入文件 ${files[i].name}`);
            paramCount += sets.length;
          }
        }
      } catch { /* 忽略参数解析错误，由parseBatteryJsonFile已发warning */ }
    }

    setWarnings(allWarnings);
    setLastImportWarnings(allWarnings);
    if (sampleCount > 0 || paramCount > 0) {
      setSuccessInfo({
        count: sampleCount,
        type: paramCount > 0 ? `样本+参数(${paramCount}组)` : '样本'
      });
    }
    setIsProcessing(false);
  }, [addSamples, importParameterSets, setLastImportWarnings]);

  const handlePhotoFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setWarnings([]);
    setSuccessInfo(null);

    const result = await mergeImageFilesAsSamples(Array.from(files));
    setWarnings(result.warnings);
    setLastImportWarnings(result.warnings);

    if (result.samples.length > 0) {
      addSamples(result.samples, `导入现场照片`);
      setSuccessInfo({ count: result.samples.length, type: '现场照片' });
    }
    setIsProcessing(false);
  }, [addSamples, setLastImportWarnings]);

  const downloadTemplate = () => {
    const content = createJsonImportTemplate();
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '电池样本导入模板.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!importDialogVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-scale-in flex flex-col">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Upload className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">导入旧材料 / 现场照片</h2>
              <p className="text-xs text-slate-400">支持 JSON 批量导入、现场照片上传、手动录入</p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-700/50 flex gap-2">
          <TabButton active={tab === 'json'} onClick={() => { setTab('json'); resetState(); }} icon={<FileJson className="w-4 h-4" />} label="JSON 文件" />
          <TabButton active={tab === 'photo'} onClick={() => { setTab('photo'); resetState(); }} icon={<ImageIcon className="w-4 h-4" />} label="现场照片" />
          <TabButton active={tab === 'manual'} onClick={() => { setTab('manual'); resetState(); }} icon={<Edit3 className="w-4 h-4" />} label="手动录入" />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'json' && (
            <JsonTab
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              onFiles={handleJsonFiles}
              inputRef={jsonInputRef}
              onDownloadTemplate={downloadTemplate}
            />
          )}
          {tab === 'photo' && (
            <PhotoTab
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              onFiles={handlePhotoFiles}
              inputRef={photoInputRef}
            />
          )}
          {tab === 'manual' && (
            <ManualTab
              onSubmit={(s) => {
                setWarnings([]);
                addSamples([s], '手动录入');
                setSuccessInfo({ count: 1, type: '手动录入样本' });
              }}
              onWarnings={(w) => setWarnings(w)}
            />
          )}

          {isProcessing && (
            <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              <span className="text-sm text-cyan-300">正在解析文件…</span>
            </div>
          )}

          {successInfo && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-emerald-300">
                成功导入 {successInfo.count} 组{successInfo.type}
              </span>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                校验信息 ({warnings.length})
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-700/50 divide-y divide-slate-700/50">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className={`p-2.5 text-xs flex items-start gap-2 ${
                      w.level === 'error' ? 'bg-rose-500/5' : 'bg-amber-500/5'
                    }`}
                  >
                    {w.level === 'error'
                      ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      : <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      {w.sampleName && <span className="font-medium text-slate-300">{w.sampleName}：</span>}
                      <span className={w.level === 'error' ? 'text-rose-300' : 'text-amber-300'}>
                        {w.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
          <p className="text-[11px] text-slate-500">
            {lastImportWarnings.length > 0
              ? `上次导入共 ${lastImportWarnings.length} 条提示信息（${lastImportWarnings.filter(w => w.level === 'error').length} 条错误）`
              : '导入的数据会自动进入历史记录，可在右侧时间线查看'}
          </p>
          <button
            onClick={close}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
        active
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface DropzoneProps {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onFiles: (f: FileList | null) => Promise<void> | void;
  inputRef: React.RefObject<HTMLInputElement>;
  accept: string;
  multiple?: boolean;
  hint: string;
  icon: React.ReactNode;
  extraAction?: React.ReactNode;
}

function Dropzone({
  isDragging, setIsDragging, onFiles, inputRef, accept, multiple, hint, icon, extraAction
}: DropzoneProps) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all
        ${isDragging
          ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
          : 'border-slate-600 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/60'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="flex flex-col items-center text-center gap-3 pointer-events-none">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
          isDragging ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400'
        }`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">
            拖放文件到这里，或点击选择文件
          </p>
          <p className="text-xs text-slate-500 mt-1">{hint}</p>
        </div>
      </div>
      {extraAction && (
        <div className="mt-4 flex justify-center pointer-events-auto">
          {extraAction}
        </div>
      )}
    </div>
  );
}

function JsonTab({
  isDragging, setIsDragging, onFiles, inputRef, onDownloadTemplate
}: Omit<DropzoneProps, 'accept' | 'hint' | 'icon'> & { onDownloadTemplate: () => void }) {
  return (
    <div className="space-y-4">
      <Dropzone
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        onFiles={onFiles}
        inputRef={inputRef}
        accept=".json,application/json"
        multiple
        hint="支持 .json 文件，可多个文件同时导入；若 JSON 内含 parameterSets 字段会一并导入参数配置"
        icon={<FileJson className="w-7 h-7" />}
        extraAction={
          <button
            onClick={(e) => { e.stopPropagation(); onDownloadTemplate(); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-200
              hover:bg-slate-600 border border-slate-600 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3 h-3" />
            下载导入模板
          </button>
        }
      />
      <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-xs space-y-2">
        <div className="font-medium text-slate-300">JSON 支持格式</div>
        <ul className="text-slate-400 space-y-1 ml-4 list-disc">
          <li>根节点为数组：<code className="text-cyan-300 font-mono">[{`{name, internalResistance, temperature, soc}`}]</code></li>
          <li>根节点为对象：<code className="text-cyan-300 font-mono">{'{samples: [...], parameterSets?: [...]}'}</code></li>
          <li>单对象：字段包含 <code className="text-cyan-300 font-mono">name</code> + 数值字段即可</li>
          <li><code className="text-cyan-300 font-mono">type</code> 可选：normal / boundary / gap，留空自动推断</li>
        </ul>
      </div>
    </div>
  );
}

function PhotoTab(props: Omit<DropzoneProps, 'accept' | 'hint' | 'icon' | 'extraAction'>) {
  return (
    <div className="space-y-4">
      <Dropzone
        {...props}
        accept="image/*"
        multiple
        hint="支持 .jpg / .png / .webg 等现场照片；导入后数值会使用默认值，需到样本卡片里手动修正"
        icon={<ImageIcon className="w-7 h-7" />}
      />
      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-2">
        <div className="font-medium text-amber-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          使用提示
        </div>
        <ul className="text-amber-200/80 space-y-1 ml-4 list-disc">
          <li>照片会直接转成 Base64 嵌入数据，10 张以上建议控制单张大小</li>
          <li>导入后的内阻、温度、SOC 需要手动校正（可在样本上展开编辑）</li>
          <li>如果图片无法读取或格式不正确，会在下方列出跳过原因</li>
        </ul>
      </div>
    </div>
  );
}

interface ManualFormState {
  name: string;
  internalResistance: string;
  temperature: string;
  soc: string;
  type: SampleType;
  testTime: string;
  notes: string;
  gapReason: string;
}

const emptyForm: ManualFormState = {
  name: '',
  internalResistance: '',
  temperature: '25',
  soc: '80',
  type: 'normal',
  testTime: new Date().toLocaleString('zh-CN'),
  notes: '',
  gapReason: ''
};

function ManualTab({
  onSubmit, onWarnings
}: {
  onSubmit: (s: BatterySample) => void;
  onWarnings: (w: ImportWarning[]) => void;
}) {
  const [form, setForm] = useState<ManualFormState>({ ...emptyForm });
  const [localErrors, setLocalErrors] = useState<ImportWarning[]>([]);

  const update = <K extends keyof ManualFormState>(k: K, v: ManualFormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  };

  const handleSubmit = () => {
    const res = buildSampleFromForm(form);
    setLocalErrors(res.warnings);
    onWarnings(res.warnings);
    if (res.sample) {
      onSubmit(res.sample);
      setForm({ ...emptyForm });
    }
  };

  const addAnother = () => {
    const res = buildSampleFromForm(form);
    setLocalErrors(res.warnings);
    onWarnings(res.warnings);
    if (res.sample) {
      onSubmit(res.sample);
      setForm({
        ...emptyForm,
        type: form.type,
        temperature: form.temperature,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="样本名称" required icon={<Tag className="w-3.5 h-3.5" />} span2>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="如：电池组F-10"
            className="input-ghost"
          />
        </Field>
        <Field label="内阻 (mΩ)" required icon={<Battery className="w-3.5 h-3.5" />}>
          <input
            type="number"
            step="0.001"
            value={form.internalResistance}
            onChange={(e) => update('internalResistance', e.target.value)}
            placeholder="如：3.45"
            className="input-ghost"
          />
        </Field>
        <Field label="温度 (°C)" required icon={<Thermometer className="w-3.5 h-3.5" />}>
          <input
            type="number"
            step="0.1"
            value={form.temperature}
            onChange={(e) => update('temperature', e.target.value)}
            className="input-ghost"
          />
        </Field>
        <Field label="SOC (%)" required icon={<Battery className="w-3.5 h-3.5" />}>
          <input
            type="number"
            min="0"
            max="100"
            value={form.soc}
            onChange={(e) => update('soc', e.target.value)}
            className="input-ghost"
          />
        </Field>
        <Field label="样本类型" required>
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'boundary', 'gap'] as SampleType[]).map(t => (
              <button
                type="button"
                key={t}
                onClick={() => update('type', t)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  form.type === t
                    ? t === 'normal' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : t === 'boundary' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                    : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {t === 'normal' ? '正常' : t === 'boundary' ? '边界' : '缺口'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="测试时间" icon={<Clock className="w-3.5 h-3.5" />}>
          <input
            type="text"
            value={form.testTime}
            onChange={(e) => update('testTime', e.target.value)}
            className="input-ghost"
          />
        </Field>
        <Field label="备注" span2>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="现场工况、操作备注等"
            className="input-ghost resize-none"
          />
        </Field>
        {form.type === 'gap' && (
          <Field label="缺口原因" span2>
            <input
              type="text"
              value={form.gapReason}
              onChange={(e) => update('gapReason', e.target.value)}
              placeholder="如：端子氧化、接触不良等"
              className="input-ghost"
            />
          </Field>
        )}
      </div>

      {localErrors.length > 0 && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
          <ul className="text-xs text-rose-300 space-y-1 ml-4 list-disc">
            {localErrors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setForm({ ...emptyForm })}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400
            hover:text-slate-200 hover:bg-slate-700/50 flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          清空
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addAnother}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-700 text-slate-200
              hover:bg-slate-600 border border-slate-600 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3 h-3" />
            保存并继续录入
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500/20 text-cyan-300
              border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
          >
            确认导入
          </button>
        </div>
      </div>

      <style>{`
        .input-ghost {
          width: 100%;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgb(51, 65, 85);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 13px;
          color: #e2e8f0;
          transition: all 0.15s;
          outline: none;
          font-family: inherit;
        }
        .input-ghost:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.15);
          background: rgba(15, 23, 42, 0.8);
        }
        .input-ghost::placeholder { color: #64748b; }
      `}</style>
    </div>
  );
}

function Field({
  label, required, icon, children, span2
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1.5">
        {icon}
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}
