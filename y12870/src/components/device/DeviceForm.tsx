import { useState } from 'react';
import { Plus, Trash2, MapPin, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import type { EnergyDevice } from '@/types';
import { checkDeviceInNoGoZone } from '@/utils/statusClassifier';

interface Props { onPick?: () => void; pendingLat?: number | null; pendingLng?: number | null; cancelPick?: () => void }

export default function DeviceForm({ onPick, pendingLat, pendingLng, cancelPick }: Props) {
  const devices = useCalcStore(s => s.devices);
  const addDevice = useCalcStore(s => s.addDevice);
  const updateDevice = useCalcStore(s => s.updateDevice);
  const removeDevice = useCalcStore(s => s.removeDevice);
  const zones = useCalcStore(s => s.noGoZones);
  const [open, setOpen] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '机组 #', lat: 30.165, lng: 122.14, ratedPower: 120, efficiency: 0.32 });

  if (pendingLat != null && pendingLng != null && !showForm) {
    setShowForm(true);
    setForm(f => ({ ...f, lat: +pendingLat.toFixed(5), lng: +pendingLng.toFixed(5) }));
  }

  function submit() {
    const d: EnergyDevice = {
      id: 'd_' + Date.now().toString(36),
      name: form.name || '机组 ' + (devices.length + 1),
      lat: Number(form.lat), lng: Number(form.lng),
      ratedPower: Number(form.ratedPower), efficiency: Number(form.efficiency),
      status: 'AVAILABLE',
    };
    const chk = checkDeviceInNoGoZone(d, zones);
    if (chk.inZone) d.status = 'RECOLLECT';
    addDevice(d);
    setShowForm(false);
    cancelPick?.();
    setForm({ name: '机组 #', lat: 30.165, lng: 122.14, ratedPower: 120, efficiency: 0.32 });
  }

  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-ocean-500" />
          <span className="panel-title">设备台账</span>
          <span className="status-tag-available">{devices.length} 台</span>
          {devices.some(d => d.inNoGoZone) && <span className="status-tag-recollect">⚠ 越界</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ocean-500" /> : <ChevronDown className="w-4 h-4 text-ocean-500" />}
      </div>
      {open && (
        <div className="p-4 space-y-3">
          {!showForm ? (
            <div
              className="w-full py-2 border-2 border-dashed rounded-lg border-ocean-200
                         hover:border-ocean-500 hover:bg-ocean-50 text-sm text-ocean-700
                         inline-flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => setShowForm(true)}
            >
              <Plus className="w-4 h-4" /> 添加设备 · 录入参数
              <span className="text-ocean-400 text-xs">或</span>
              <span
                role="button" tabIndex={0}
                className="px-2 py-0.5 rounded bg-ocean-100 text-ocean-700 text-xs inline-flex items-center gap-1 hover:bg-ocean-200"
                onClick={e => { e.stopPropagation(); onPick?.(); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPick?.(); } }}
              >
                <MapPin className="w-3 h-3" /> 地图取点
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-ocean-200 bg-ocean-50/50 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="名称"><input className="input-field !py-1.5 text-xs" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
                <Field label="额定功率 (kW)">
                  <input type="number" className="input-field !py-1.5 text-xs tabular-nums" value={form.ratedPower}
                         onChange={e => setForm(f => ({ ...f, ratedPower: Number(e.target.value) }))} />
                </Field>
                <Field label="纬度">
                  <div className="flex gap-1">
                    <input type="number" step="0.00001" className="input-field !py-1.5 text-xs tabular-nums font-mono flex-1"
                           value={form.lat} onChange={e => setForm(f => ({ ...f, lat: Number(e.target.value) }))} />
                    <button
                      className={`px-2 rounded text-xs ${pendingLng ? 'bg-status-deferred text-ocean-900 animate-pulse' : 'bg-ocean-200 text-ocean-700 hover:bg-ocean-300'}`}
                      onClick={onPick} title="从地图取点"
                    ><MapPin className="w-3.5 h-3.5" /></button>
                  </div>
                </Field>
                <Field label="经度">
                  <input type="number" step="0.00001" className="input-field !py-1.5 text-xs tabular-nums font-mono"
                         value={form.lng} onChange={e => setForm(f => ({ ...f, lng: Number(e.target.value) }))} />
                </Field>
                <Field label="转换效率 (0-1)" className="col-span-2">
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.1" max="0.5" step="0.01" className="flex-1 accent-ocean-500"
                           value={form.efficiency} onChange={e => setForm(f => ({ ...f, efficiency: Number(e.target.value) }))} />
                    <span className="font-mono tabular-nums text-ocean-700 w-12 text-right">{form.efficiency.toFixed(2)}</span>
                  </div>
                </Field>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button className="btn-ghost" onClick={() => { setShowForm(false); cancelPick?.(); }}>取消</button>
                <button className="btn-primary" onClick={submit}>
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> 添加
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 max-h-52 overflow-y-auto workbench-scroll">
            {devices.map(d => (
              <DeviceRow key={d.id} device={d}
                onUpdate={(p) => updateDevice(d.id, p)}
                onDelete={() => removeDevice(d.id)} />
            ))}
            {devices.length === 0 && !showForm && (
              <div className="text-center py-4 text-ocean-500 text-xs">暂无设备，请添加或载入示例</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: any; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-[10px] text-ocean-500 mb-0.5">{label}</div>
      {children}
    </label>
  );
}

function DeviceRow({ device, onUpdate, onDelete }: {
  device: EnergyDevice;
  onUpdate: (p: Partial<EnergyDevice>) => void;
  onDelete: () => void;
}) {
  const chk = checkDeviceInNoGoZone(device, useCalcStore.getState().noGoZones);
  const statusLabel = { AVAILABLE: '可用', DEFERRED: '暂缓', RECOLLECT: '需重采' }[device.status];
  return (
    <div className={`p-2.5 rounded-lg border text-xs transition-all ${
      chk.inZone ? 'bg-status-recollect-soft/40 border-status-recollect/30'
      : device.status === 'DEFERRED' ? 'bg-status-deferred-soft/40 border-status-deferred/30'
      : 'bg-white border-slate-200 hover:shadow-card'
    }`}>
      <div className="flex items-start gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          chk.inZone ? 'bg-status-recollect text-white'
          : device.status === 'DEFERRED' ? 'bg-status-deferred text-white'
          : 'bg-status-available text-white'
        }`}>
          <Zap className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-ocean-900 truncate">{device.name}</div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                device.status === 'AVAILABLE' ? 'bg-status-available-soft text-status-available'
                : device.status === 'DEFERRED' ? 'bg-status-deferred-soft text-status-deferred'
                : 'bg-status-recollect-soft text-status-recollect'
              }`}>{statusLabel}</span>
              <button className="p-0.5 text-ocean-400 hover:text-status-recollect" onClick={onDelete}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="font-mono tabular-nums text-[11px] text-ocean-700 mt-0.5">
            ({device.lat.toFixed(4)}, {device.lng.toFixed(4)}) · {device.ratedPower}kW · η={device.efficiency.toFixed(2)}
          </div>
          {chk.inZone && (
            <div className="mt-1 text-[11px] text-status-recollect font-medium">⚠ 越界：位于「{chk.zoneName}」内，建议 <button className="underline hover:text-ocean-900" onClick={() => onUpdate({ status: 'AVAILABLE' })}>忽略</button> 或重新选点</div>
          )}
        </div>
      </div>
    </div>
  );
}
