import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft, MapPin, Calendar, User, FileText, Image, GitCompare, ChevronRight, X,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { useBusBayStore } from '@/store';
import { StatusBadge } from '@/components/StatusBadge';
import { DuplicateBadge } from '@/components/DuplicateBadge';
import { BadDataIndicator } from '@/components/BadDataIndicator';
import type { VersionHistory, ChangedBy } from '@/types';
import { cn } from '@/lib/utils';

// 修复 Leaflet 默认图标
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const oldIcon = L.divIcon({ className: 'old-m', html: '<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #ef4444;"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
const newIcon = L.divIcon({ className: 'new-m', html: '<div style="background:#22c55e;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #22c55e;"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });

// 配置常量
const CHANGED_BY_LABELS: Record<ChangedBy, { label: string; color: string }> = {
  resident: { label: '居民反馈', color: 'bg-blue-100 text-blue-700' },
  field: { label: '现场勘测', color: 'bg-purple-100 text-purple-700' },
  planner: { label: '规划师', color: 'bg-amber-100 text-amber-700' },
};
const FIELD_LABELS: Record<string, string> = {
  currentCapacity: '当前容量', designCapacity: '设计容量', status: '状态',
  lngLat: '坐标位置', feedbackCount: '反馈数量', name: '站名', road: '道路', district: '行政区',
};
const STATUS_LABELS: Record<string, string> = { normal: '正常', abnormal: '异常', pending: '待复核' };

const formatValue = (field: string, val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (field === 'status' && typeof val === 'string') return STATUS_LABELS[val] || val;
  if (field === 'lngLat' && Array.isArray(val)) return `(${val[0]}, ${val[1]})`;
  return Array.isArray(val) ? val.join(', ') : String(val);
};
const fmtDT = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function BayDetail() {
  const { bayId } = useParams<{ bayId: string }>();
  const navigate = useNavigate();
  const bays = useBusBayStore((s) => s.bays);
  const versionsAll = useBusBayStore((s) => s.versions);
  const feedbacksAll = useBusBayStore((s) => s.feedbacks);

  const bay = useMemo(() => bays.find((b) => b.id === bayId), [bays, bayId]);
  const versions = useMemo(() => {
    if (!bayId) return [];
    return versionsAll
      .filter((v) => v.bayId === bayId)
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }, [bayId, versionsAll]);
  const feedbacks = useMemo(() => {
    if (!bayId) return [];
    return feedbacksAll.filter((fb) => fb.bayId === bayId);
  }, [bayId, feedbacksAll]);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const toggleCompare = (verId: string) => setCompareIds((p) => {
    if (p.includes(verId)) return p.filter((id) => id !== verId);
    if (p.length >= 2) return [p[1], verId];
    return [...p, verId];
  });
  const clearCompare = () => setCompareIds([]);

  const compareVersions = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const v1 = versions.find((v) => v.id === compareIds[0]);
    const v2 = versions.find((v) => v.id === compareIds[1]);
    if (!v1 || !v2) return null;
    return new Date(v1.changedAt) > new Date(v2.changedAt)
      ? { oldVer: v2, newVer: v1 } : { oldVer: v1, newVer: v2 };
  }, [compareIds, versions]);

  const latestLngLatChange = useMemo(() =>
    versions.find((v) => v.fieldName === 'lngLat' && v.oldLngLat && v.newLngLat), [versions]);

  if (!bay) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500 mb-4">未找到该站点信息</p>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />返回
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部面包屑 + 返回 */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center max-w-[1800px] mx-auto gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors" title="返回">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <nav className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => navigate('/')}>总览</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 hover:text-slate-700 cursor-pointer" onClick={() => navigate('/')}>站点列表</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-900 font-semibold">{bay.name}</span>
          </nav>
        </div>
      </div>

      {/* 主体左右两栏 */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="flex gap-6">
          {/* 左侧 55%：地图 + 截图说明 */}
          <div className="w-[55%] space-y-6">
            {/* 地图 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />地理位置
                </h3>
                {latestLngLatChange && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white" />旧位置</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 border-2 border-white" />新位置</span>
                  </div>
                )}
              </div>
              <div className="h-[420px]">
                <MapContainer center={[bay.lat, bay.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {latestLngLatChange?.oldLngLat && latestLngLatChange?.newLngLat ? (
                    <>
                      <Marker position={[latestLngLatChange.oldLngLat[1], latestLngLatChange.oldLngLat[0]]} icon={oldIcon}>
                        <Popup><div className="text-sm"><div className="font-semibold text-red-600 mb-1">旧位置</div><div>{bay.name}</div><div className="text-slate-500">容量：{bay.currentCapacity}/{bay.designCapacity} 辆</div></div></Popup>
                      </Marker>
                      <Marker position={[latestLngLatChange.newLngLat[1], latestLngLatChange.newLngLat[0]]} icon={newIcon}>
                        <Popup><div className="text-sm"><div className="font-semibold text-green-600 mb-1">新位置</div><div>{bay.name}</div><div className="text-slate-500">容量：{bay.currentCapacity}/{bay.designCapacity} 辆</div></div></Popup>
                      </Marker>
                      <Polyline positions={[[latestLngLatChange.oldLngLat[1], latestLngLatChange.oldLngLat[0]], [latestLngLatChange.newLngLat[1], latestLngLatChange.newLngLat[0]]]}
                        pathOptions={{ color: '#f97316', weight: 3, dashArray: '8, 8', opacity: 0.8 }} />
                    </>
                  ) : (
                    <Marker position={[bay.lat, bay.lng]} icon={defaultIcon}>
                      <Popup><div className="text-sm"><div className="font-semibold mb-1">{bay.name}</div><div className="text-slate-500">容量：{bay.currentCapacity}/{bay.designCapacity} 辆</div></div></Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>

            {/* 截图说明区 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Image className="w-5 h-5 text-purple-600" />现场照片与截图说明</h3>
              </div>
              <div className="p-5 space-y-5 max-h-[600px] overflow-y-auto">
                {versions.filter((v) => v.attachments.length > 0).length === 0 ? (
                  <div className="text-center py-12 text-slate-400"><Image className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>暂无现场照片</p></div>
                ) : (
                  versions.filter((v) => v.attachments.length > 0).map((ver) => (
                    <div key={ver.id} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-700">{fmtDT(ver.changedAt)}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', CHANGED_BY_LABELS[ver.changedBy].color)}>{CHANGED_BY_LABELS[ver.changedBy].label}</span>
                        </div>
                        <span className="text-slate-500 text-xs">{ver.attachments.length} 张附件</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {ver.changeSummary && <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded">{ver.changeSummary}</p>}
                        {ver.remark && <p className="text-sm text-slate-500">📝 {ver.remark}</p>}
                        <div className="grid grid-cols-3 gap-2">
                          {ver.attachments.map((src, idx) => (
                            <a key={idx} href={src} target="_blank" rel="noreferrer" className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors group">
                              <img src={src} alt={`附件${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右侧 45% */}
          <div className="w-[45%] space-y-6">
            {/* 基本信息卡 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-800">{bay.name}</h2></div>
              <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                {[
                  { label: '所在道路', value: bay.road },
                  { label: '所属行政区', value: bay.district },
                  { label: '设计容量', value: `${bay.designCapacity} 辆` },
                  { label: '当前容量', value: `${bay.currentCapacity} 辆` },
                  { label: '站点状态', render: () => <StatusBadge status={bay.status} /> },
                  { label: '坐标位置', render: () => <span className="font-mono text-xs text-slate-600">{bay.lng.toFixed(6)}, {bay.lat.toFixed(6)}</span> },
                  { label: '创建时间', render: () => <span className="text-slate-600">{fmtDT(bay.createdAt)}</span> },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-slate-400 text-xs mb-1">{item.label}</div>
                    <div className="text-slate-800 font-medium">{'render' in item && item.render ? item.render() : item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 对比面板 */}
            {compareVersions && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 ring-1 ring-blue-100">
                <div className="px-5 py-3 border-b border-blue-100 flex items-center justify-between bg-blue-50/50">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2"><GitCompare className="w-5 h-5 text-blue-600" />版本对比</h3>
                  <button onClick={clearCompare} className="p-1.5 rounded-md hover:bg-white/80 text-slate-500 hover:text-slate-700"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4 text-xs">
                    <div className="text-slate-500"><span className="text-red-600 font-semibold">旧版本</span>：{fmtDT(compareVersions.oldVer.changedAt)}</div>
                    <div className="text-slate-500"><span className="text-green-600 font-semibold">新版本</span>：{fmtDT(compareVersions.newVer.changedAt)}</div>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 text-xs">
                        <th className="px-3 py-2 text-left font-medium bg-red-50 text-red-700 w-[28%]">旧值</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600 w-[20%] border-x border-slate-200">字段</th>
                        <th className="px-3 py-2 text-left font-medium bg-green-50 text-green-700 w-[52%]">新值</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {['currentCapacity', 'designCapacity', 'status', 'lngLat'].map((field) => {
                          const oldVal = field === 'lngLat' ? compareVersions.oldVer.oldLngLat
                            : compareVersions.oldVer.fieldName === field ? compareVersions.oldVer.oldValue : undefined;
                          const newVal = field === 'lngLat' ? compareVersions.newVer.newLngLat
                            : compareVersions.newVer.fieldName === field ? compareVersions.newVer.newValue : undefined;
                          const has = oldVal !== undefined || newVal !== undefined;
                          return (
                            <tr key={field} className={has ? '' : 'opacity-40'}>
                              <td className="px-3 py-2.5 bg-red-50/40 align-top"><span className="break-all">{formatValue(field, oldVal)}</span></td>
                              <td className="px-3 py-2.5 text-center border-x border-slate-100 align-top font-medium text-slate-600">{FIELD_LABELS[field] || field}</td>
                              <td className="px-3 py-2.5 bg-green-50/40 align-top"><span className="break-all">{formatValue(field, newVal)}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 版本历史时间线 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600" />版本变更历史（共 {versions.length} 条）</h3>
                {compareIds.length > 0 && <button onClick={clearCompare} className="text-xs text-slate-500 hover:text-slate-700">已选 {compareIds.length}/2 · 清除</button>}
              </div>
              <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
                {versions.length === 0 ? <div className="text-center py-8 text-slate-400 text-sm">暂无变更记录</div> : versions.map((ver: VersionHistory) => {
                  const isSel = compareIds.includes(ver.id);
                  return (
                    <div key={ver.id} className={cn('relative pl-8 pb-4 border-l-2 last:border-l-transparent last:pb-0', isSel ? 'border-blue-400' : 'border-slate-200')}>
                      <div className={cn('absolute left-0 top-1 -translate-x-[7px] w-4 h-4 rounded-full border-2 border-white', isSel ? 'bg-blue-500 shadow shadow-blue-200' : 'bg-slate-400')} />
                      <div className={cn('rounded-lg border p-4 transition-all', isSel ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300')}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-700 font-medium">{fmtDT(ver.changedAt)}</span>
                            <span className={cn('px-2 py-0.5 rounded-full font-medium', CHANGED_BY_LABELS[ver.changedBy].color)}>
                              <User className="w-3 h-3 inline -mt-0.5 mr-1" />{CHANGED_BY_LABELS[ver.changedBy].label}
                            </span>
                          </div>
                          <button onClick={() => toggleCompare(ver.id)} disabled={!isSel && compareIds.length >= 2}
                            className={cn('shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                              isSel ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50')}>
                            <GitCompare className="w-3 h-3" />{isSel ? '已选中' : '对比查看'}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-slate-200">
                            <span className="text-slate-500 mr-1.5">{FIELD_LABELS[ver.fieldName] || ver.fieldName}：</span>
                            <span className="text-red-600 font-medium">{formatValue(ver.fieldName, ver.oldValue)}</span>
                            <span className="mx-1.5 text-slate-400">→</span>
                            <span className="text-green-600 font-medium">{formatValue(ver.fieldName, ver.newValue)}</span>
                          </span>
                        </div>
                        {ver.changeSummary && <p className="text-sm text-slate-600 mb-2">{ver.changeSummary}</p>}
                        {ver.attachments.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/70">
                            <div className="flex gap-1.5">
                              {ver.attachments.slice(0, 4).map((src, idx) => (
                                <img key={idx} src={src} alt={`附件${idx + 1}`} className="w-12 h-12 object-cover rounded border border-slate-200 hover:scale-105 transition-transform cursor-pointer" />
                              ))}
                            </div>
                            <span className="text-xs text-slate-400">{ver.attachments.length} 个附件</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 关联居民反馈 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-cyan-600" />关联居民反馈（{feedbacks.length} 条）</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                {feedbacks.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm">暂无关联居民反馈</div> : feedbacks.map((fb) => (
                  <div key={fb.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="font-medium text-slate-800">{fb.residentName || '（匿名）'}</span>
                        <span className="text-slate-400 font-mono text-xs">{fb.phone || '无电话'}</span>
                        <span className="text-[11px] text-slate-400">原行 #{fb.sourceRow}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {fb.isDuplicate && fb.duplicateOrder && <DuplicateBadge count={fb.duplicateOrder} size="sm" />}
                        {fb.badDataFlags.length > 0 && <BadDataIndicator flags={fb.badDataFlags} sourceRow={fb.sourceRow} size="sm" />}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{fb.content || '（无内容）'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
