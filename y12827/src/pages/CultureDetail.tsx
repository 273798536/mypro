import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, History, Edit, GitCompare } from "lucide-react";
import { useStore } from "@/store";
import type { CultureRecordVersion } from "@/types";

function DetailSkeleton() {
  return (
    <div className="card space-y-3 animate-pulse">
      <div className="h-5 bg-stone-100 rounded w-1/3" />
      <div className="h-20 bg-stone-100 rounded" />
      <div className="h-4 bg-stone-100 rounded w-1/2" />
    </div>
  );
}

export default function CultureDetail() {
  const { recordId } = useParams<{ recordId: string }>();
  const {
    currentCulture, cultureVersions, versionDiff,
    fetchCultureRecord, fetchCultureVersions, fetchVersionDiff,
    updateCultureRecord, loading, error,
  } = useStore();

  const [editing, setEditing] = useState(false);
  const [newConclusion, setNewConclusion] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [v1, setV1] = useState(1);
  const [v2, setV2] = useState(2);

  useEffect(() => {
    if (recordId) {
      fetchCultureRecord(recordId);
      fetchCultureVersions(recordId);
    }
  }, [recordId, fetchCultureRecord, fetchCultureVersions]);

  useEffect(() => {
    if (currentCulture) setNewConclusion(currentCulture.conclusion);
  }, [currentCulture]);

  const handleSave = async () => {
    if (!recordId || !changeReason.trim() || !newConclusion.trim()) return;
    await updateCultureRecord(recordId, newConclusion.trim(), "张技师", changeReason.trim());
    setEditing(false);
    setChangeReason("");
    if (recordId) {
      fetchCultureVersions(recordId);
    }
  };

  const handleCompare = () => {
    if (!recordId) return;
    fetchVersionDiff(recordId, v1, v2);
  };

  if (error) {
    return (
      <div className="card border border-red-200 text-red-600 text-sm p-4">
        加载失败：{error}
      </div>
    );
  }

  if (loading && !currentCulture) return <DetailSkeleton />;
  if (!currentCulture) return null;

  const DiffField = ({ label, oldVal, newVal }: { label: string; oldVal: string; newVal: string }) => {
    const differ = oldVal !== newVal;
    return (
      <div>
        <p className="text-xs text-stone-400 mb-0.5">{label}</p>
        <p className={`text-sm ${differ ? "bg-amber-100 px-1 rounded" : ""}`}>{newVal}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-stone-400">
        <Link to="/cultures" className="flex items-center gap-1 hover:text-brand transition-colors">
          <ArrowLeft size={14} /> 返回培养记录
        </Link>
        <span>/</span>
        <span className="text-stone-600">{currentCulture.sample_id}</span>
      </div>

      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-serif text-stone-800">{currentCulture.sample_id}</h2>
            <p className="text-stone-600 text-sm mt-2 leading-relaxed">{currentCulture.conclusion}</p>
          </div>
          {!editing && (
            <button className="btn-secondary flex items-center gap-1.5" onClick={() => setEditing(true)}>
              <Edit size={14} /> 编辑
            </button>
          )}
        </div>
        <div className="flex gap-6 text-sm text-stone-400">
          <span>版本 <strong className="text-stone-600">{currentCulture.current_version}</strong></span>
          <span>更新时间 {currentCulture.updated_at}</span>
          <span>更新人 {currentCulture.updated_by}</span>
        </div>

        {editing && (
          <div className="border-t border-stone-100 pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">新结论</label>
              <textarea
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand resize-none"
                rows={4}
                value={newConclusion}
                onChange={(e) => setNewConclusion(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                变更原因 <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand resize-none"
                rows={2}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="必填：说明变更原因"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setEditing(false); setChangeReason(""); }}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={!changeReason.trim() || !newConclusion.trim()}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-serif text-stone-800 flex items-center gap-2">
            <History size={16} className="text-brand" />
            历史版本
            <span className="text-sm text-stone-400 font-sans">({cultureVersions.length})</span>
          </h3>
          {currentCulture.current_version > 1 && (
            <button
              className="btn-secondary flex items-center gap-1.5 text-xs"
              onClick={() => setShowCompare(!showCompare)}
            >
              <GitCompare size={14} /> 对比版本
            </button>
          )}
        </div>

        {showCompare && cultureVersions.length >= 2 && (
          <div className="flex items-end gap-3 p-3 bg-stone-50 rounded-lg">
            <div>
              <label className="block text-xs text-stone-500 mb-1">旧版本</label>
              <select
                className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                value={v1}
                onChange={(e) => setV1(Number(e.target.value))}
              >
                {cultureVersions.map((ver: CultureRecordVersion) => (
                  <option key={ver.version} value={ver.version}>v{ver.version}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">新版本</label>
              <select
                className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                value={v2}
                onChange={(e) => setV2(Number(e.target.value))}
              >
                {cultureVersions.map((ver: CultureRecordVersion) => (
                  <option key={ver.version} value={ver.version}>v{ver.version}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary text-xs py-1.5" onClick={handleCompare}>对比</button>
          </div>
        )}

        <div className="space-y-2">
          {cultureVersions.map((ver: CultureRecordVersion) => (
            <div key={ver.version} className="p-3 bg-stone-50 rounded-lg text-sm">
              <div className="flex items-center gap-3 text-stone-500 mb-1">
                <span className="font-medium text-stone-700">v{ver.version}</span>
                <span>{ver.changed_by}</span>
                <span className="text-stone-400">{ver.changed_at}</span>
              </div>
              <p className="text-stone-600 truncate">{ver.conclusion}</p>
              {ver.change_reason && (
                <p className="text-xs text-stone-400 mt-1">原因：{ver.change_reason}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {versionDiff && (
        <div className="card space-y-4">
          <h3 className="text-base font-serif text-stone-800 flex items-center gap-2">
            <GitCompare size={16} className="text-brand" />
            版本对比
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-stone-500">旧版本 v{versionDiff.version1.version}</p>
              <div className="space-y-2">
                <DiffField label="结论" oldVal={versionDiff.version1.conclusion} newVal={versionDiff.version1.conclusion} />
                <p className="text-xs text-stone-400">修改人</p>
                <p className="text-sm">{versionDiff.version1.changed_by}</p>
                <p className="text-xs text-stone-400">修改时间</p>
                <p className="text-sm">{versionDiff.version1.changed_at}</p>
                <p className="text-xs text-stone-400">变更原因</p>
                <p className="text-sm">{versionDiff.version1.change_reason}</p>
              </div>
            </div>
            <div className="bg-brand-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-medium text-brand">新版本 v{versionDiff.version2.version}</p>
              <div className="space-y-2">
                <DiffField label="结论" oldVal={versionDiff.version1.conclusion} newVal={versionDiff.version2.conclusion} />
                <p className="text-xs text-stone-400">修改人</p>
                <p className="text-sm">{versionDiff.version2.changed_by}</p>
                <p className="text-xs text-stone-400">修改时间</p>
                <p className="text-sm">{versionDiff.version2.changed_at}</p>
                <p className="text-xs text-stone-400">变更原因</p>
                <p className="text-sm">{versionDiff.version2.change_reason}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">
            由 {versionDiff.version2.changed_by} 于 {versionDiff.version2.changed_at} 修改，原因：{versionDiff.version2.change_reason}
          </p>
        </div>
      )}
    </div>
  );
}
