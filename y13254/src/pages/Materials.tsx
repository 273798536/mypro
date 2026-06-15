import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  Eye,
  GitCompare,
  X,
  AlertCircle,
  FileImage,
  Map as MapIcon,
  FileText,
  CheckCircle2,
  Search,
} from "lucide-react";
import { useStore } from "@/store";
import { getMaterialVersions, updateItem } from "@/lib/api";
import type { Material, MaterialType, NoticeItem } from "@/shared/types";

const TYPE_LABELS: Record<MaterialType, { label: string; icon: any; color: string }> = {
  photo: { label: "照片", icon: FileImage, color: "bg-blue-50 text-blue-600 border-blue-200" },
  boundary: { label: "边界", icon: MapIcon, color: "bg-green-50 text-green-600 border-green-200" },
  verbal_note: {
    label: "口头说明",
    icon: FileText,
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
};

const TYPE_EMOJI: Record<MaterialType, string> = {
  photo: "📷",
  boundary: "🗺️",
  verbal_note: "📝",
};

interface ExtendedMaterial {
  id: string;
  locationId: string;
  type: MaterialType;
  version: number;
  previousVersionId?: string | null;
  payload?: any;
  hasCaliberChange: 0 | 1 | boolean;
  changeNote?: string | null;
  capturedAt?: string | null;
  submittedBy?: string | null;
  title?: string;
  filePath?: string;
  uploader?: string;
  createdAt: string;
}

function getMatTitle(m: ExtendedMaterial): string {
  if ((m as any).title) return (m as any).title;
  if (m.payload?.title) return m.payload.title;
  const typeLabel = TYPE_LABELS[m.type]?.label ?? m.type;
  return `${typeLabel} v${m.version}`;
}

function getMatUploader(m: ExtendedMaterial): string {
  if ((m as any).uploader) return (m as any).uploader;
  if (m.submittedBy) return m.submittedBy;
  return "小赵";
}

function getMatPreviewUrl(m: ExtendedMaterial): string {
  if ((m as any).filePath) return (m as any).filePath;
  if (m.payload?.url) return m.payload.url;
  if (m.payload?.path) return m.payload.path;
  return "";
}

function getMatTranscript(m: ExtendedMaterial): string {
  if (m.payload?.transcript) return m.payload.transcript;
  if (m.payload?.geometry) return JSON.stringify(m.payload.geometry, null, 2);
  if (m.payload) return JSON.stringify(m.payload, null, 2);
  return "(无预览内容)";
}

function formatDate(s: string): string {
  try {
    const d = new Date(s);
    return (
      d.toLocaleDateString("zh-CN") +
      " " +
      d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return s;
  }
}

function isTruthy(v: boolean | 0 | 1 | undefined | null): boolean {
  return v === true || v === 1;
}

export default function Materials() {
  const materials = useStore((s) => s.materials as ExtendedMaterial[]);
  const locations = useStore((s) => s.locations);
  const items = useStore((s) => s.items);
  const loadAll = useStore((s) => s.loadAll);
  const uploadMaterialAndRefresh = useStore((s) => s.uploadMaterialAndRefresh);

  const [keyword, setKeyword] = useState("");
  const [filterLocationId, setFilterLocationId] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | MaterialType>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [compareCtx, setCompareCtx] = useState<{
    material: ExtendedMaterial;
    versions: ExtendedMaterial[];
  } | null>(null);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (filterLocationId !== "all" && m.locationId !== filterLocationId) return false;
      if (filterType !== "all" && m.type !== filterType) return false;
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const loc = locations.find((l) => l.id === m.locationId);
        if (loc?.canonicalName.toLowerCase().includes(kw)) return true;
        if (m.changeNote?.toLowerCase().includes(kw)) return true;
        if (getMatTitle(m).toLowerCase().includes(kw)) return true;
        return false;
      }
      return true;
    });
  }, [materials, filterLocationId, filterType, keyword, locations]);

  const getLocationName = (lid: string) =>
    locations.find((l) => l.id === lid)?.canonicalName || "未知点位";

  const getVersions = async (m: ExtendedMaterial) => {
    const versions = (await getMaterialVersions(m.id)) as unknown as ExtendedMaterial[];
    setCompareCtx({ material: m, versions });
  };

  const closeCompare = () => setCompareCtx(null);

  const handlePreview = (m: ExtendedMaterial) => {
    const url = getMatPreviewUrl(m);
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("该材料无预览链接");
    }
  };

  const calibreChangeCount = materials.filter((m) => isTruthy(m.hasCaliberChange)).length;

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1">
        <h1 className="font-serif-display text-2xl text-night-500 mb-4">材料中心</h1>
        <p className="text-slate-500 text-sm mb-6">
          巡检照片、边界样本、口头说明统一归档；同类型两版可对比&quot;口径变更&quot;
        </p>

        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <span className="text-xs text-slate-400">共 {materials.length} 份材料</span>
          {calibreChangeCount > 0 && (
            <span className="text-xs text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {calibreChangeCount} 份存在口径变更
            </span>
          )}
        </div>

        {/* 顶栏过滤 + 上传 */}
        <div className="card-shadow rounded-lg overflow-hidden bg-white p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索点位/变更说明..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-64 pl-9 pr-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">点位：</label>
            <select
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value)}
              className="px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm bg-white min-w-[180px]"
            >
              <option value="all">全部点位</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.canonicalName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">类型：</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm bg-white min-w-[140px]"
            >
              <option value="all">全部类型</option>
              <option value="photo">照片 📷</option>
              <option value="boundary">边界 🗺️</option>
              <option value="verbal_note">口头说明 📝</option>
            </select>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setShowUpload(true)}
            className="bg-night-500 hover:bg-night-700 text-white px-4 py-2 rounded-md text-sm transition-all hover:shadow-md flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            上传新材料
          </button>
        </div>

        {/* 卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const cfg = TYPE_LABELS[m.type];
            const TagIcon = cfg.icon;
            return (
              <div
                key={m.id}
                className="card-shadow rounded-lg overflow-hidden bg-white relative"
              >
                {isTruthy(m.hasCaliberChange) && (
                  <div className="absolute top-0 right-0 bg-market-500 text-white text-xs px-2.5 py-1 rounded-bl-md font-medium z-10">
                    口径变更 v{m.version}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-800 pr-2 line-clamp-2">
                      {getMatTitle(m)}
                    </h3>
                    <span
                      className={`border rounded px-2 py-0.5 text-xs inline-flex items-center gap-1 flex-shrink-0 ${cfg.color}`}
                    >
                      <TagIcon className="w-3 h-3" />
                      {TYPE_EMOJI[m.type]} {cfg.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 mb-4">
                    <div>点位：{getLocationName(m.locationId)}</div>
                    <div className="flex gap-4 flex-wrap">
                      <span>上传者：{getMatUploader(m)}</span>
                      <span>版本：v{m.version}</span>
                    </div>
                    <div>创建时间：{formatDate(m.createdAt)}</div>
                    {m.changeNote && (
                      <div className="text-market-600 pt-1 border-t border-slate-100 mt-1">
                        变更说明：{m.changeNote}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreview(m)}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-md text-sm flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      预览
                    </button>
                    <button
                      onClick={() => void getVersions(m)}
                      className="flex-1 bg-night-500 hover:bg-night-700 text-white px-3 py-1.5 rounded-md text-sm transition-all flex items-center justify-center gap-1"
                    >
                      <GitCompare className="w-4 h-4" />
                      对比版本
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm text-slate-400 card-shadow rounded-lg bg-white">
              暂无匹配的材料
            </div>
          )}
        </div>
      </div>

      {/* 上传弹窗 */}
      {showUpload && (
        <UploadModal
          locations={locations}
          onClose={() => setShowUpload(false)}
          onSubmit={async (fd) => {
            await uploadMaterialAndRefresh(fd);
            setShowUpload(false);
          }}
        />
      )}

      {/* 版本对比弹窗 */}
      {compareCtx && (
        <CompareModal
          ctx={compareCtx}
          locationName={getLocationName(compareCtx.material.locationId)}
          items={items}
          onClose={closeCompare}
          onConfirm={async () => {
            await loadAll();
            closeCompare();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- 上传弹窗 ---------------- */
function UploadModal({
  locations,
  onClose,
  onSubmit,
}: {
  locations: { id: string; canonicalName: string }[];
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id || "");
  const [type, setType] = useState<MaterialType>("photo");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploader, setUploader] = useState("小赵");
  const [changeNote, setChangeNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      alert("请选择关联点位");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("locationId", locationId);
      fd.append("type", type);
      if (title) fd.append("title", title);
      fd.append("uploader", uploader);
      if (changeNote) fd.append("changeNote", changeNote);
      if (file) fd.append("file", file);
      await onSubmit(fd);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card-shadow rounded-lg overflow-hidden bg-white w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-serif-display text-lg text-night-500">上传新材料</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              关联点位 <span className="text-red-500">*</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all bg-white"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.canonicalName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MaterialType)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all bg-white"
            >
              <option value="photo">照片 📷</option>
              <option value="boundary">边界 🗺️</option>
              <option value="verbal_note">口头说明 📝</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入材料标题"
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              上传文件
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all bg-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-night-50 file:text-night-700 file:text-sm file:cursor-pointer"
            />
            {type !== "photo" && (
              <p className="text-xs text-slate-400 mt-1">边界/口头说明类型可不上传文件</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">上传者</label>
            <input
              type="text"
              value={uploader}
              onChange={(e) => setUploader(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              口径变更说明（可选）
            </label>
            <textarea
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              rows={3}
              placeholder="如果本版本相较上版存在口径变更，请在此说明，例如：摊位范围向东扩展2米"
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-night-500 hover:bg-night-700 text-white px-4 py-2 rounded-md text-sm transition-all hover:shadow-md disabled:opacity-60"
            >
              {loading ? "上传中..." : "提交上传"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- 版本对比弹窗 ---------------- */
function CompareModal({
  ctx,
  locationName,
  items,
  onClose,
  onConfirm,
}: {
  ctx: { material: ExtendedMaterial; versions: ExtendedMaterial[] };
  locationName: string;
  items: NoticeItem[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState<"reject" | "approve" | null>(null);
  const versions = ctx.versions;
  const v2 = versions[0];
  const v1 = versions[1];

  if (!v2 || !v1) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="card-shadow rounded-lg overflow-hidden bg-white w-full max-w-md p-6 text-center">
          <p className="text-slate-600 mb-4">该材料暂无可对比的历史版本（仅1个版本）</p>
          <button
            onClick={onClose}
            className="bg-night-500 hover:bg-night-700 text-white px-4 py-2 rounded-md text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    );
  }

  const changeNote = v2.changeNote;

  const relatedItem = items.find((i) => i.locationId === v2.locationId);

  const buildRemarkPrefix = (version: number) =>
    `版本口径确认：以 v${version} 为准`;

  const mergeRemark = (oldRemark: string | null | undefined, prefix: string): string => {
    const old = oldRemark?.trim() || "";
    return old ? `${prefix}；${old}` : prefix;
  };

  const handleReject = async () => {
    if (!relatedItem) {
      alert("未找到关联的公示条目，无法写入备注");
      return;
    }
    setLoading("reject");
    try {
      await updateItem(relatedItem.id, {
        currentRemark: mergeRemark(relatedItem.currentRemark, buildRemarkPrefix(v1.version)),
      });
      await onConfirm();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const handleApprove = async () => {
    if (!relatedItem) {
      alert("未找到关联的公示条目，无法写入备注");
      return;
    }
    setLoading("approve");
    try {
      await updateItem(relatedItem.id, {
        currentRemark: mergeRemark(relatedItem.currentRemark, buildRemarkPrefix(v2.version)),
      });
      await onConfirm();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const renderPreview = (m: ExtendedMaterial) => {
    const url = getMatPreviewUrl(m);
    if (m.type === "photo" && url && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) {
      return (
        <div>
          <img
            src={url}
            alt="preview"
            className="max-h-[400px] object-contain w-full rounded border border-slate-200 bg-slate-50"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const next = (e.currentTarget as HTMLImageElement)
                .nextElementSibling as HTMLElement | null;
              if (next) next.style.display = "block";
            }}
          />
          <div style={{ display: "none" }}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-night-500 hover:underline text-xs break-all"
            >
              文件路径：{url}
            </a>
          </div>
        </div>
      );
    }
    return (
      <div>
        {url && (
          <div className="mb-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-night-500 hover:underline text-xs break-all"
            >
              文件路径：{url}
            </a>
          </div>
        )}
        <pre className="max-h-[400px] overflow-auto p-3 rounded border border-slate-200 bg-slate-50 text-xs text-slate-700 whitespace-pre-wrap break-words">
          {getMatTranscript(m)}
        </pre>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card-shadow rounded-lg overflow-hidden bg-white w-[960px] max-w-full max-h-[90vh] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="font-serif-display text-lg text-night-500">
            版本对比 - {locationName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 差异横幅 */}
        <div className="bg-market-500 text-white px-6 py-3 text-sm flex items-start gap-2 flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            本版相对上版：
            {changeNote ||
              "标题或文件路径存在改动，请规划师确认口径是否可接受"}
          </span>
        </div>

        {/* 两屏对比 */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* v1 */}
          <div className="w-1/2 overflow-y-auto p-5 border-r border-slate-200">
            <div className="mb-3 pb-3 border-b border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">版本 v{v1.version}</span>
                <span className="text-xs text-slate-500">{formatDate(v1.createdAt)}</span>
              </div>
              <div className="text-xs text-slate-500">上传者：{getMatUploader(v1)}</div>
              <div className="text-sm text-slate-700 font-medium pt-1">
                {getMatTitle(v1)}
              </div>
            </div>
            {renderPreview(v1)}
          </div>
          {/* v2 */}
          <div className="w-1/2 overflow-y-auto p-5">
            <div className="mb-3 pb-3 border-b border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">版本 v{v2.version}</span>
                <span className="text-xs text-slate-500">{formatDate(v2.createdAt)}</span>
              </div>
              <div className="text-xs text-slate-500">上传者：{getMatUploader(v2)}</div>
              <div className="text-sm text-slate-700 font-medium pt-1">
                {getMatTitle(v2)}
              </div>
            </div>
            {renderPreview(v2)}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            {loading === "reject" ? "处理中..." : `驳回：回退到 v${v1.version}`}
          </button>
          <button
            onClick={handleApprove}
            disabled={loading !== null}
            className="bg-night-500 hover:bg-night-700 text-white px-4 py-2 rounded-md text-sm transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading === "approve" ? "处理中..." : `放行：以 v${v2.version} 口径为准`}
          </button>
        </div>
      </div>
    </div>
  );
}
