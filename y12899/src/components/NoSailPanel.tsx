import { useState } from 'react';
import { MapPin, AlertOctagon, Ban, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ViolationRecord, NoSailZone } from '../types';

interface NoSailPanelProps {
  violations: ViolationRecord[];
  zones: NoSailZone[];
  className?: string;
}

interface ViolationDetailProps {
  violation: ViolationRecord;
}

function ViolationDetail({ violation }: ViolationDetailProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-rose-100/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
            <Ban size={20} />
          </div>
          <div>
            <h4 className="font-medium text-rose-800">
              越界记录 - {violation.zoneName}
            </h4>
            <p className="text-sm text-rose-600">
              时间：{new Date(violation.point.timestamp).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {violation.intercepted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
              <Ban size={12} />
              已拦截
            </span>
          )}
          {isOpen ? <ChevronUp size={18} className="text-rose-400" /> : <ChevronDown size={18} className="text-rose-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-rose-200 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-slate-500">位置坐标</p>
              <p className="font-mono text-sm text-slate-700 mt-1">
                {violation.point.location.lat.toFixed(4)}, {violation.point.location.lng.toFixed(4)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-slate-500">禁航区</p>
              <p className="font-medium text-sm text-slate-700 mt-1">{violation.zoneName}</p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-sm font-medium text-amber-800">漂移原因分析</h5>
                <p className="text-sm text-amber-700 mt-0.5">{violation.driftReason}</p>
              </div>
            </div>
          </div>

          {violation.interceptionNote && (
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
              <div className="flex items-start gap-2">
                <AlertOctagon size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-sm font-medium text-rose-800">拦截说明</h5>
                  <p className="text-sm text-rose-700 mt-0.5">{violation.interceptionNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NoSailPanel({ violations, zones, className }: NoSailPanelProps) {
  const interceptedCount = violations.filter(v => v.intercepted).length;
  const activeViolations = violations.filter(v => !v.intercepted).length;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <MapPin size={20} className="text-sky-600" />
          禁航区越界检测
        </h3>
        <div className="flex gap-4 text-sm">
          <span className="text-slate-500">
            已定义禁航区：<span className="font-medium text-slate-700">{zones.length}</span> 个
          </span>
          <span className="text-rose-600">
            越界记录：<span className="font-bold">{violations.length}</span> 条
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">监测数据点</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">24</p>
          <p className="text-xs text-slate-400 mt-1">当日有效数据点</p>
        </div>
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
          <p className="text-xs text-rose-500">越界记录</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{violations.length}</p>
          <p className="text-xs text-rose-400 mt-1">其中已拦截 {interceptedCount} 条</p>
        </div>
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-500">待处理</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{activeViolations}</p>
          <p className="text-xs text-amber-400 mt-1">需要人工确认</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
        <h4 className="text-sm font-medium text-slate-600 mb-3">禁航区定义</h4>
        <div className="grid grid-cols-2 gap-3">
          {zones.map(zone => (
            <div key={zone.id} className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-rose-500" />
                <span className="font-medium text-slate-700">{zone.name}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{zone.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {violations.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-600">越界记录详情</h4>
          {violations.map(violation => (
            <ViolationDetail key={violation.id} violation={violation} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-emerald-300 p-8 text-center bg-emerald-50/50">
          <MapPin size={48} className="mx-auto text-emerald-400" />
          <p className="mt-2 text-emerald-600 font-medium">未检测到禁航区越界</p>
          <p className="text-sm text-emerald-500">所有浮标数据点均在允许范围内</p>
        </div>
      )}
    </div>
  );
}
