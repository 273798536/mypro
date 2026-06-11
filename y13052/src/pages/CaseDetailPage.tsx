import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Clock, Image as ImageIcon, AlertTriangle, Paperclip, Download,
  MapPin, Link2, FileText, Users, Layers, Camera, Check, XCircle, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore.js';
import { formatDate } from '@/lib/api.js';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
import { StatusBadge, ObjectTypeBadge } from '@/components/StatusBadge.js';
import TimelinePanel from '@/components/TimelinePanel.js';
import PhotoGrid from '@/components/PhotoGrid.js';
import CollisionObjectList from '@/components/CollisionObjectList.js';
import RejudgeForm from '@/components/RejudgeForm.js';
import type { PreReviewCase } from '../../shared/types.js';

export default function CaseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    currentCase, loadCase, loading, error: storeError,
    setHighlight, highlightPhotoId, highlightObjectId,
    success, setSuccess, error,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'photos' | 'objects' | 'attachments'>('timeline');
  const [linkedPhotos, setLinkedPhotos] = useState<string[]>([]);
  const [linkedObjects, setLinkedObjects] = useState<string[]>([]);
  const [linkedAttachments, setLinkedAttachments] = useState<string[]>([]);

  const photosRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadCase(id);
    return () => {
      setSuccess(null);
    };
  }, [id, loadCase, setSuccess]);

  useEffect(() => {
    const photoId = searchParams.get('photo');
    const objectId = searchParams.get('object');
    if (photoId || objectId) {
      setHighlight(photoId || null, objectId || null);
      if (photoId) {
        setActiveTab('photos');
        setTimeout(() => photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
      if (objectId) {
        setActiveTab('objects');
        setTimeout(() => objectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
    return () => setHighlight(null, null);
  }, [searchParams, setHighlight]);

  const cs = currentCase;

  const jumpToPhoto = (photoId?: string, objectId?: string) => {
    const sp = new URLSearchParams();
    if (photoId) sp.set('photo', photoId);
    if (objectId) sp.set('object', objectId);
    setSearchParams(sp);
  };

  const clearSelection = () => {
    setLinkedPhotos([]);
    setLinkedObjects([]);
    setLinkedAttachments([]);
  };

  const togglePhotoLink = (photoId: string) => {
    setLinkedPhotos((prev) => prev.includes(photoId) ? prev.filter((x) => x !== photoId) : [...prev, photoId]);
  };

  const toggleObjectLink = (objectId: string) => {
    setLinkedObjects((prev) => prev.includes(objectId) ? prev.filter((x) => x !== objectId) : [...prev, objectId]);
  };

  const toggleAttachmentLink = (attId: string) => {
    setLinkedAttachments((prev) => prev.includes(attId) ? prev.filter((x) => x !== attId) : [...prev, attId]);
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'html') => {
    if (!cs) return;
    try {
      const res = await fetch(`/api/cases/${cs.id}/export?format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '导出失败' }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const mime = res.headers.get('Content-Type') || 'application/octet-stream';
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: mime });
      const url = URL.createObjectURL(blob);
      const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'html';
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${cs.caseNumber}-复核报告.${ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '导出失败';
      alert(msg);
    }
  };

  if (loading) return <div className="text-center py-16 text-slate-500">加载中…</div>;
  if (storeError) return <div className="text-center py-16 text-red-500">{storeError}</div>;
  if (!cs) return <div className="text-center py-16 text-slate-500">案件不存在</div>;

  const unlinkedAttachments = cs.attachments.filter((a) => !a.linkedToConclusion);
  const gapCount = cs.timeline.filter((t) => t.isGap).length;

  return (
    <div className="space-y-5">
      {success && (
        <div className="eng-card p-3 bg-emerald-50 border-l-4 border-l-emerald-500 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">{success}</p>
            <p className="text-xs text-emerald-600 mt-0.5">接口已持久化到后端，状态已同步至 <code className="bg-white/70 px-1 rounded text-[10px]">.data/cases.json</code>，可前往操作历史查看记录</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-800"><XCircle className="w-4 h-4" /></button>
        </div>
      )}
      {error && (
        <div className="eng-card p-3 bg-red-50 border-l-4 border-l-red-500 flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 flex-1">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/cases')} className="eng-btn !px-2.5 !py-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          返回列表
        </button>
        <h2 className="font-mono text-lg font-bold text-marine-800">{cs.caseNumber}</h2>
        <StatusBadge status={cs.status} />
        <ObjectTypeBadge type={cs.objectType} />
        {gapCount > 0 && (
          <span className="eng-chip bg-amber-50 text-amber-700 border-amber-200 animate-breath">
            <AlertTriangle className="w-3 h-3" />
            时间轴 {gapCount} 处缺段
          </span>
        )}
        {cs.hasLateAttachment && unlinkedAttachments.length > 0 && (
          <span className="eng-chip bg-rose-50 text-rose-700 border-rose-200">
            <Paperclip className="w-3 h-3" />
            {unlinkedAttachments.length} 个晚到附件未关联结论
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="eng-card p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-xs font-bold text-marine-700 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                案件概览
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value="html"
                  onChange={(e) => handleExport(e.target.value as 'pdf' | 'csv' | 'html')}
                  className="text-xs px-2 py-1 border border-slate-300 bg-white rounded-sm focus:outline-none focus:ring-1 focus:ring-marine-500"
                >
                  <option value="html">HTML 报告（推荐）</option>
                  <option value="pdf">PDF 报告</option>
                  <option value="csv">CSV 数据</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleExport('html')}
                  className="eng-btn eng-btn-primary text-[11px] px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出复核报告
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <OverviewItem icon={MapPin} label="位置" value={cs.location} />
              <OverviewItem icon={FileText} label="碰撞描述" value={cs.collisionSummary} long />
              <OverviewItem icon={Users} label="最后操作人" value={cs.lastOperator} />
              <OverviewItem icon={Clock} label="最后更新" value={formatDate(cs.updatedAt)} mono />
              <OverviewItem icon={ImageIcon} label="巡检照片" value={`${cs.photoCount} 张`} />
              <OverviewItem icon={AlertTriangle} label="碰撞对象" value={`${cs.collisionObjects.length} 个`} />
              <OverviewItem icon={Paperclip} label="晚到附件" value={`${cs.attachments.length} 个`} />
              <OverviewItem icon={Link2} label="改判次数" value={`${cs.rejudgeCount} 次`} />
            </div>
          </div>

          <div className="eng-card overflow-hidden">
            <div className="flex items-center border-b border-slate-200 bg-slate-50">
              {([
                { k: 'timeline', label: '时间轴', icon: Clock, count: cs.timeline.length },
                { k: 'photos', label: '巡检照片', icon: Camera, count: cs.photos.length },
                { k: 'objects', label: '碰撞对象', icon: MapPin, count: cs.collisionObjects.length },
                { k: 'attachments', label: '晚到附件', icon: Paperclip, count: cs.attachments.length },
              ] as { k: typeof activeTab; label: string; icon: LucideIcon; count: number }[]).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === t.k
                      ? 'text-marine-700 border-marine-600 bg-white'
                      : 'text-slate-500 border-transparent hover:text-marine-600'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                  <span className="text-xs font-mono text-slate-400">{t.count}</span>
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === 'timeline' && (
                <TimelinePanel
                  events={cs.timeline}
                  photos={cs.photos}
                  objects={cs.collisionObjects}
                  onJump={(pid, oid) => jumpToPhoto(pid, oid)}
                />
              )}
              {activeTab === 'photos' && (
                <div ref={photosRef}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      点击照片查看原图与原始说明；可勾选照片作为改判/补录证据
                    </p>
                    {linkedPhotos.length > 0 && (
                      <span className="eng-chip bg-marine-50 text-marine-700 border-marine-200 text-xs">
                        <Check className="w-3 h-3" />
                        已选 {linkedPhotos.length} 张作为证据
                      </span>
                    )}
                  </div>
                  <PhotoGrid
                    photos={cs.photos}
                    objects={cs.collisionObjects}
                    highlightPhotoId={highlightPhotoId}
                    selectedForLink={linkedPhotos}
                    onSelectForLink={togglePhotoLink}
                    onViewObject={(oid) => jumpToPhoto(undefined, oid)}
                  />
                </div>
              )}
              {activeTab === 'objects' && (
                <div ref={objectsRef}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      每个对象都可追溯到巡检照片原始行号
                    </p>
                    {linkedObjects.length > 0 && (
                      <span className="eng-chip bg-marine-50 text-marine-700 border-marine-200 text-xs">
                        <Check className="w-3 h-3" />
                        已选 {linkedObjects.length} 个对象
                      </span>
                    )}
                  </div>
                  <CollisionObjectList
                    objects={cs.collisionObjects}
                    photos={cs.photos}
                    highlightObjectId={highlightObjectId}
                    selectedForLink={linkedObjects}
                    onSelectForLink={toggleObjectLink}
                    onJumpToPhoto={(pid) => jumpToPhoto(pid, undefined)}
                  />
                </div>
              )}
              {activeTab === 'attachments' && (
                <AttachmentList
                  cs={cs}
                  attachments={cs.attachments}
                  linkedAttachments={linkedAttachments}
                  onToggleLink={toggleAttachmentLink}
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <RejudgeForm
            cs={cs}
            linkedPhotos={linkedPhotos}
            linkedObjects={linkedObjects}
            linkedAttachments={linkedAttachments}
            onToggleAttachment={toggleAttachmentLink}
            onClearSelection={clearSelection}
          />

          <div className="eng-card p-4">
            <h4 className="text-xs font-bold text-marine-700 font-mono uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              操作提示
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex gap-2">
                <span className="text-marine-500">▸</span>
                时间轴缺段点击后可追溯到巡检照片的原始行与对象
              </li>
              <li className="flex gap-2">
                <span className="text-marine-500">▸</span>
                在"巡检照片"或"碰撞对象"页签勾选后，可将其作为改判证据
              </li>
              <li className="flex gap-2">
                <span className="text-marine-500">▸</span>
                右上角"复制链接"可将当前筛选与定位分享给评审同事
              </li>
              <li className="flex gap-2">
                <span className="text-marine-500">▸</span>
                改判/补录操作将真实写回后端，并在"操作历史"中留痕
              </li>
              <li className="flex gap-2">
                <span className="text-marine-500">▸</span>
                切换"补录记录"可新增附件、时间轴说明或勾选旧的晚到附件
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewItem({ icon: Icon, label, value, long, mono }:
  { icon: LucideIcon; label: string; value: string; long?: boolean; mono?: boolean }) {
  return (
    <div className={long ? 'col-span-2' : ''}>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      <p className={`text-slate-800 ${mono ? 'font-mono text-xs' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  );
}

function AttachmentList({ cs, attachments, linkedAttachments, onToggleLink }:
  { cs: PreReviewCase; attachments: PreReviewCase['attachments']; linkedAttachments: string[]; onToggleLink: (id: string) => void }) {
  if (!attachments.length) {
    return <div className="text-center py-8 text-slate-400 text-sm">暂无晚到附件</div>;
  }

  const handleDownload = async (a: PreReviewCase['attachments'][number], e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const res = await fetch(`/api/cases/${cs.id}/attachments/${a.id}/download`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '下载失败' }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const mime = res.headers.get('Content-Type') || 'application/octet-stream';
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = a.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '下载失败';
      alert(msg);
    }
  };

  return (
    <div className="space-y-3 relative">
      {attachments.map((a, idx) => (
        <label
          key={a.id}
          className={`eng-card p-3 relative block cursor-pointer transition-all ${
            !a.linkedToConclusion ? 'border-l-4 border-l-rose-300 hover:border-l-rose-500 hover:shadow-engineering-hover' : 'border-l-4 border-l-emerald-300'
          }`}
          style={{ animation: `staggerFade 0.4s ease-out ${idx * 60}ms both` }}
        >
          <div className="flex items-start gap-3">
            {!a.linkedToConclusion && (
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-rose-600 flex-shrink-0"
                checked={linkedAttachments.includes(a.id)}
                onChange={() => onToggleLink(a.id)}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-marine-800 truncate">{a.fileName}</span>
                {!a.linkedToConclusion && (
                  <span className="eng-chip bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                    未关联结论
                  </span>
                )}
                {a.linkedToConclusion && (
                  <span className="eng-chip bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                    <Check className="w-3 h-3" />
                    已关联
                  </span>
                )}
                <span className="eng-chip bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                  {a.fileType.toUpperCase()}
                </span>
                {a.fileSize > 0 && (
                  <span className="eng-chip bg-slate-50 text-slate-500 border-slate-200 text-[10px]">
                    {formatFileSize(a.fileSize)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">{a.description}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-1.5">
                {a.uploadedAt && formatDate(a.uploadedAt)} · {a.uploadedBy}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
              <button
                type="button"
                onClick={(e) => handleDownload(a, e)}
                disabled={!a.filePath}
                className="eng-btn eng-btn-secondary text-[10px] px-2 py-1 flex items-center gap-1"
                title={a.filePath ? '下载附件' : '文件尚未生成'}
              >
                <Download className="w-3 h-3" />
                下载
              </button>
              <Paperclip className={`w-4 h-4 ${a.linkedToConclusion ? 'text-emerald-500' : 'text-rose-500 animate-breath'}`} />
            </div>
          </div>
          {!a.linkedToConclusion && a.conclusionId && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-500 font-mono">
                关联的结论ID：<span className="text-emerald-700">{a.conclusionId}</span>
              </p>
            </div>
          )}
        </label>
      ))}
      {attachments.some((a) => !a.linkedToConclusion) && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-700">
          <p className="font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            晚到附件关联提醒
          </p>
          <p>勾选附件可在改判或补录时将其关联到最终结论，关联后会写入结论ID并持久化。</p>
        </div>
      )}
    </div>
  );
}
