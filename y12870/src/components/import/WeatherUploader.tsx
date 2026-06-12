import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, FileWarning, AlertTriangle, CheckCircle2, CloudRain, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import { validateWeatherRows, FIELD_HINT_MAP, REQUIRED_WEATHER_FIELDS } from '@/utils/weatherValidator';
import type { ImportValidationError } from '@/types';

export default function WeatherUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const store = useCalcStore;
  const weather = store(s => s.weather);
  const source = store(s => s.weatherSourceName);
  const setWeather = store(s => s.setWeather);
  const [open, setOpen] = useState(true);
  const [errors, setErrors] = useState<ImportValidationError[]>([]);
  const [warnings, setWarnings] = useState<ImportValidationError[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFile(f: File) {
    setBusy(true); setErrors([]); setWarnings([]);
    try {
      let rows: Record<string, any>[] = [];
      if (f.name.toLowerCase().endsWith('.csv')) {
        rows = await new Promise((res, rej) => {
          Papa.parse(f, {
            header: true, skipEmptyLines: true,
            complete: r => res(r.data as Record<string, any>[]),
            error: e => rej(e),
          });
        });
      } else {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, any>[];
      }
      const v = validateWeatherRows(rows, f.name);
      setErrors(v.errors); setWarnings(v.warnings);
      if (v.ok) setWeather(v.data, f.name);
    } catch (e: any) {
      setErrors([{ message: '文件解析失败：' + (e?.message || '未知错误'), suggestion: '请检查文件是否损坏或格式是否正确' }]);
    } finally { setBusy(false); }
  }

  function remove() {
    setWeather([], '');
    setErrors([]); setWarnings([]);
  }

  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-ocean-500" />
          <span className="panel-title">气象预报数据</span>
          {!source && <span className="status-tag-recollect">未导入</span>}
          {source && <span className="status-tag-available">已导入 {weather.length} 条</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ocean-500" /> : <ChevronDown className="w-4 h-4 text-ocean-500" />}
      </div>
      {open && (
        <div className="p-4 space-y-3">
          <div className="text-xs text-ocean-700">
            必填列：{REQUIRED_WEATHER_FIELDS.map(f => `${f}（${FIELD_HINT_MAP[f]}）`).join('、')}
          </div>
          <input
            ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            className="w-full py-6 border-2 border-dashed rounded-lg border-ocean-200
                       hover:border-ocean-500 hover:bg-ocean-50 transition-colors
                       flex flex-col items-center gap-2 text-ocean-700"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Upload className="w-7 h-7 text-ocean-500" />
            <span className="text-sm font-medium">{busy ? '解析中…' : '点击上传 CSV / Excel 气象预报文件'}</span>
            <span className="text-xs text-ocean-500/70">ECMWF / CMA 数值预报导出格式通用</span>
          </button>

          {source && (
            <div className="flex items-center justify-between text-sm p-2 rounded bg-status-available-soft">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-status-available shrink-0" />
                <span className="truncate tabular-nums">{source}</span>
              </div>
              <button className="btn-ghost" onClick={remove} title="移除数据">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!!errors.length && (
            <div className="p-3 rounded bg-status-recollect-soft border border-status-recollect/30">
              <div className="flex items-center gap-2 text-status-recollect text-sm font-medium mb-2">
                <FileWarning className="w-4 h-4" /> 格式校验未通过
              </div>
              <ul className="space-y-1 text-xs text-ocean-950">
                {errors.slice(0, 5).map((e, i) => (
                  <li key={i}>
                    <div className="font-medium">· {e.message}</div>
                    {e.suggestion && <div className="pl-3 text-ocean-700">建议：{e.suggestion}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!warnings.length && !errors.length && (
            <div className="p-3 rounded bg-status-deferred-soft border border-status-deferred/30">
              <div className="flex items-center gap-2 text-status-deferred text-sm font-medium mb-2">
                <AlertTriangle className="w-4 h-4" /> 数据提醒（{warnings.length}）
              </div>
              <ul className="space-y-0.5 text-xs text-ocean-950 max-h-24 overflow-y-auto workbench-scroll">
                {warnings.slice(0, 10).map((w, i) => <li key={i}>· {w.message}</li>)}
                {warnings.length > 10 && <li className="text-ocean-700">…另有 {warnings.length - 10} 条省略</li>}
              </ul>
            </div>
          )}

          {weather.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="有效波高均值" value={`${(weather.reduce((s, w) => s + w.waveHeight, 0) / weather.length).toFixed(2)} m`} />
              <Stat label="平均周期" value={`${(weather.reduce((s, w) => s + w.wavePeriod, 0) / weather.length).toFixed(1)} s`} />
              <Stat label="平均风速" value={`${(weather.reduce((s, w) => s + w.windSpeed, 0) / weather.length).toFixed(1)} m/s`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-ocean-50 border border-ocean-100">
      <div className="text-[10px] text-ocean-500 leading-tight">{label}</div>
      <div className="text-sm font-mono tabular-nums text-ocean-900 mt-0.5">{value}</div>
    </div>
  );
}
