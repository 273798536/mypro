import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusTag } from '@/components/ui/StatusTag';
import { SchemeCompare } from '@/components/point/SchemeCompare';
import { RawDataViewer } from '@/components/point/RawDataViewer';
import { NoteList, ScreenshotGallery } from '@/components/point/NotesAndScreenshots';
import { AmapWrapper } from '@/components/map/AmapWrapper';
import type { PointStatus, Scheme } from '@/types';
import {
  ArrowLeft,
  MapPin,
  FileText,
  Image,
  Database,
  GitMerge,
  Plus,
  AlertTriangle,
  Link as LinkIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { STATUS_LABELS } from '@/types';

type DetailTab = 'schemes' | 'notes' | 'screenshots' | 'raw' | 'merge';

export default function PointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { points, schemes, notes, screenshots, versionHistory, mergeRelations } = useAppStore();
  const {
    addScheme,
    addNote,
    addScreenshot,
    updatePoint,
  } = useAppStore((s) => s.actions);

  const [activeTab, setActiveTab] = useState<DetailTab>('schemes');
  const [showAddScheme, setShowAddScheme] = useState(false);
  const [newScheme, setNewScheme] = useState<Partial<Scheme>>({
    title: '',
    content: '',
    version: 'v1.0',
  });

  const point = useMemo(() => points.find((p) => p.id === id), [points, id]);
  const pointSchemes = useMemo(
    () => schemes.filter((s) => s.point_id === id),
    [schemes, id],
  );
  const pointNotes = useMemo(
    () => notes.filter((n) => n.point_id === id),
    [notes, id],
  );
  const pointScreenshots = useMemo(
    () => screenshots.filter((s) => s.point_id === id),
    [screenshots, id],
  );

  const mergedTo = useMemo(() => {
    if (!point) return null;
    const rel = mergeRelations.find((r) => r.source_point_id === point.id);
    if (rel) {
      const target = points.find((p) => p.id === rel.target_point_id);
      return { relation: rel, point: target };
    }
    return null;
  }, [point, mergeRelations, points]);

  const mergedFrom = useMemo(() => {
    if (!point) return [];
    return mergeRelations
      .filter((r) => r.target_point_id === point.id)
      .map((r) => ({
        relation: r,
        point: points.find((p) => p.id === r.source_point_id),
      }))
      .filter((x) => x.point);
  }, [point, mergeRelations, points]);

  if (!point) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 mb-4">点位不存在</p>
        <Link to="/points">
          <Button variant="secondary">返回列表</Button>
        </Link>
      </div>
    );
  }

  const hasConflict = pointSchemes.some((s) => s.is_conflict);

  const tabs: Array<{ key: DetailTab; label: string; icon: any; count?: number }> = [
    { key: 'schemes', label: '方案比选', icon: FileText, count: pointSchemes.length },
    { key: 'notes', label: '人工备注', icon: FileText, count: pointNotes.length },
    { key: 'screenshots', label: '截图附件', icon: Image, count: pointScreenshots.length },
    { key: 'raw', label: '原始数据', icon: Database },
    { key: 'merge', label: '归并关系', icon: GitMerge, count: mergedFrom.length + (mergedTo ? 1 : 0) },
  ];

  const handleAddScheme = () => {
    if (newScheme.title && newScheme.content && point) {
      addScheme({
        point_id: point.id,
        title: newScheme.title,
        content: newScheme.content,
        version: newScheme.version || 'v1.0',
        status: 'active',
        is_conflict: false,
        created_by: '周姐',
      });
      setShowAddScheme(false);
      setNewScheme({ title: '', content: '', version: 'v1.0' });
    }
  };

  const handleAddNote = (content: string) => {
    addNote({
      point_id: point.id,
      content,
      created_by: '周姐',
    });
  };

  const handleUploadScreenshot = (file: File, desc: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      addScreenshot({
        point_id: point.id,
        data_url: reader.result as string,
        description: desc,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/points')}
          className="p-2 hover:bg-slate-100 rounded-sm text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-serif text-xl font-bold text-slate-800">{point.name}</h2>
            <StatusTag status={point.status} />
            {hasConflict && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-sm">
                <AlertTriangle size={12} /> 存在方案冲突
              </span>
            )}
            {point.corrected_fields.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded-sm">
                已修正 {point.corrected_fields.length} 个字段
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {point.address || '地址未填写'} · 来源：{point.source} · 坐标：
            <span className="font-mono">{point.lng?.toFixed(4)}, {point.lat?.toFixed(4)}</span>
          </p>
        </div>
        <select
          value={point.status}
          onChange={(e) => updatePoint(point.id, { status: e.target.value as PointStatus })}
          className="px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-slate-500"
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              标记为：{v}
            </option>
          ))}
        </select>
      </div>

      {mergedTo && (
        <div className="flex items-center gap-3 p-3 bg-slate-100 border border-slate-200 rounded-sm text-sm text-slate-700">
          <LinkIcon size={16} className="text-slate-500" />
          <span>
            此点位已归并至：
            <Link
              to={`/points/${mergedTo.point?.id}`}
              className="font-medium text-slate-900 underline hover:text-slate-700"
            >
              {mergedTo.point?.name}
            </Link>
            （相似度 {Math.round(mergedTo.relation.name_similarity * 100)}%，距离 {Math.round(mergedTo.relation.distance_meters)} 米）
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-0">
            <div className="flex border-b border-slate-200 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px ${
                      active
                        ? 'border-slate-800 text-slate-900 font-medium'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                    {typeof tab.count === 'number' && tab.count > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded-sm ${
                          active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center px-4">
                {activeTab === 'schemes' && (
                  <Button size="sm" className="gap-1" onClick={() => setShowAddScheme(true)}>
                    <Plus size={14} /> 新增方案
                  </Button>
                )}
              </div>
            </div>
            <div className="p-5">
              {activeTab === 'schemes' && (
                <SchemeCompare schemes={pointSchemes} />
              )}
              {activeTab === 'notes' && (
                <NoteList notes={pointNotes} onAdd={handleAddNote} />
              )}
              {activeTab === 'screenshots' && (
                <ScreenshotGallery
                  screenshots={pointScreenshots}
                  onUpload={handleUploadScreenshot}
                />
              )}
              {activeTab === 'raw' && (
                <RawDataViewer point={point} versionHistory={versionHistory} />
              )}
              {activeTab === 'merge' && (
                <div className="space-y-4">
                  {mergedTo && (
                    <div className="p-3 border border-slate-200 rounded-sm bg-slate-50">
                      <p className="text-xs text-slate-500 mb-2">已归并入（本点位为源点位）</p>
                      {mergedTo.point && (
                        <Link
                          to={`/points/${mergedTo.point.id}`}
                          className="flex items-center gap-3 hover:bg-white p-2 -mx-2 rounded-sm transition-colors"
                        >
                          <MapPin size={16} className="text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-800">{mergedTo.point.name}</p>
                            <p className="text-xs text-slate-500">
                              相似度 {Math.round(mergedTo.relation.name_similarity * 100)}% · 距离 {Math.round(mergedTo.relation.distance_meters)} 米
                            </p>
                          </div>
                        </Link>
                      )}
                    </div>
                  )}
                  {mergedFrom.length > 0 && (
                    <div className="p-3 border border-slate-200 rounded-sm bg-green-50">
                      <p className="text-xs text-slate-500 mb-2">已纳入的归并点位（本点位为主点位）</p>
                      <div className="space-y-1">
                        {mergedFrom.map(({ point: sp, relation }) =>
                          sp ? (
                            <Link
                              key={sp.id}
                              to={`/points/${sp.id}`}
                              className="flex items-center gap-3 hover:bg-white p-2 -mx-2 rounded-sm transition-colors"
                            >
                              <GitMerge size={16} className="text-green-600" />
                              <div>
                                <p className="font-medium text-slate-800">{sp.name}</p>
                                <p className="text-xs text-slate-500">
                                  相似度 {Math.round(relation.name_similarity * 100)}% · 距离 {Math.round(relation.distance_meters)} 米 · {relation.merged_by} 于 {new Date(relation.merged_at).toLocaleDateString('zh-CN')} 操作
                                </p>
                              </div>
                            </Link>
                          ) : null,
                        )}
                      </div>
                    </div>
                  )}
                  {!mergedTo && mergedFrom.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-sm">
                      暂无归并关系
                      <div className="mt-2">
                        <Link to="/merge">
                          <Button variant="secondary" size="sm">
                            前往归并检测
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card title="点位位置" subtitle="点击标记可查看其他点位">
            <div className="h-64 -mx-5 -my-5">
              <AmapWrapper
                points={points.filter((p) => p.lng && p.lat)}
                center={[point.lng, point.lat]}
                zoom={16}
                onPointClick={(p) => navigate(`/points/${p.id}`)}
                className="h-full w-full"
              />
            </div>
          </Card>

          <Card title="基础信息">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">点位名称</dt>
                <dd className="text-slate-800 text-right max-w-[60%]">{point.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">地址</dt>
                <dd className="text-slate-800 text-right max-w-[60%]">{point.address || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">经度</dt>
                <dd className="text-slate-800 font-mono">{point.lng?.toFixed(6)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">纬度</dt>
                <dd className="text-slate-800 font-mono">{point.lat?.toFixed(6)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">数据来源</dt>
                <dd className="text-slate-800 text-right max-w-[60%]">{point.source}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">创建时间</dt>
                <dd className="text-slate-800 text-right max-w-[60%]">
                  {new Date(point.created_at).toLocaleString('zh-CN')}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">更新时间</dt>
                <dd className="text-slate-800 text-right max-w-[60%]">
                  {new Date(point.updated_at).toLocaleString('zh-CN')}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <Modal
        open={showAddScheme}
        onClose={() => setShowAddScheme(false)}
        title="新增比选方案"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">方案标题</label>
            <input
              type="text"
              value={newScheme.title}
              onChange={(e) => setNewScheme({ ...newScheme, title: e.target.value })}
              placeholder="如：方案A：双侧坡道改造"
              className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">版本号</label>
            <input
              type="text"
              value={newScheme.version}
              onChange={(e) => setNewScheme({ ...newScheme, version: e.target.value })}
              placeholder="v1.0"
              className="w-32 px-3 py-2 border border-slate-300 rounded-sm text-sm font-mono focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">方案内容</label>
            <textarea
              value={newScheme.content}
              onChange={(e) => setNewScheme({ ...newScheme, content: e.target.value })}
              placeholder="详细描述方案内容，包括造价、工期、优缺点等..."
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm resize-none focus:outline-none focus:border-slate-500"
            />
          </div>
          <p className="text-xs text-slate-500">
            提示：若新版本号低于已有方案，系统将自动标记为版本冲突并高亮提醒。
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAddScheme(false)}>
              取消
            </Button>
            <Button onClick={handleAddScheme}>保存方案</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
