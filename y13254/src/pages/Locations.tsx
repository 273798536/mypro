import { useState } from "react";
import { Search, MapPin, Edit2, Plus, Check, X } from "lucide-react";
import { useStore } from "../store";
import { createLocation, updateAliases, checkCoordinate } from "../lib/api";
import Empty from "../components/Empty";
import type { Location } from "../shared/types";

export default function Locations() {
  const locations = useStore((s) => s.locations);
  const items = useStore((s) => s.items);
  const setStore = useStore.setState;
  const [keyword, setKeyword] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState<string[]>([]);
  const [coordCheck, setCoordCheck] = useState<Record<string, { valid: boolean; reason?: string }>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    canonicalName: "",
    aliases: "",
    lng: "",
    lat: "",
  });

  const filtered = locations.filter((loc) => {
    if (!keyword) return true;
    const kw = keyword.toLowerCase();
    if (loc.canonicalName.toLowerCase().includes(kw)) return true;
    if (loc.aliases.some((a) => a.toLowerCase().includes(kw))) return true;
    return false;
  });

  const getItemForLocation = (locId: string) =>
    items.find((i) => i.locationId === locId);

  const startEditAliases = (loc: Location) => {
    setEditingId(loc.id);
    setAliasDraft([...loc.aliases]);
  };

  const saveAliases = async (locId: string) => {
    try {
      const updated = await updateAliases(locId, aliasDraft);
      setStore({
        locations: locations.map((l) => (l.id === locId ? updated : l)),
      });
      setEditingId(null);
    } catch (e) {
      console.error("保存别名失败", e);
    }
  };

  const handleCheckCoord = async (loc: Location) => {
    try {
      const result = await checkCoordinate(loc.id, { lng: loc.lng, lat: loc.lat });
      setCoordCheck((prev) => ({ ...prev, [loc.id]: result }));
    } catch (e) {
      console.error("检查坐标失败", e);
    }
  };

  const handleCreate = async () => {
    if (!createForm.canonicalName || !createForm.lng || !createForm.lat) return;
    try {
      const created = await createLocation({
        canonicalName: createForm.canonicalName,
        aliases: createForm.aliases
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
        lng: parseFloat(createForm.lng),
        lat: parseFloat(createForm.lat),
        boundaryGeoJSON: {
          type: "Polygon",
          coordinates: [
            [
              [parseFloat(createForm.lng) - 0.0004, parseFloat(createForm.lat) - 0.0004],
              [parseFloat(createForm.lng) + 0.0004, parseFloat(createForm.lat) - 0.0004],
              [parseFloat(createForm.lng) + 0.0004, parseFloat(createForm.lat) + 0.0004],
              [parseFloat(createForm.lng) - 0.0004, parseFloat(createForm.lat) + 0.0004],
              [parseFloat(createForm.lng) - 0.0004, parseFloat(createForm.lat) - 0.0004],
            ],
          ],
        },
      });
      setStore({ locations: [created, ...locations] });
      setShowCreate(false);
      setCreateForm({ canonicalName: "", aliases: "", lng: "", lat: "" });
    } catch (e) {
      console.error("创建点位失败", e);
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-slate-50">
      <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">点位管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">共 {locations.length} 个点位</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-night-500 hover:bg-night-700 text-white px-4 py-2 rounded-md text-sm transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          新增点位
        </button>
      </div>

      <div className="p-5 border-b border-slate-200 bg-white">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索点位名或别名..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="h-full">
            <Empty />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((loc) => {
              const item = getItemForLocation(loc.id);
              const check = coordCheck[loc.id];
              const isEditing = editingId === loc.id;
              return (
                <div
                  key={loc.id}
                  className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-800 truncate">
                          {loc.canonicalName}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="font-mono">
                            {loc.lng.toFixed(4)}, {loc.lat.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      {item && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                            item.status === "approved"
                              ? "bg-emerald-50 text-emerald-600"
                              : item.status === "need_supplement"
                              ? "bg-red-50 text-red-600"
                              : item.status === "pending_manual"
                              ? "bg-purple-50 text-purple-600"
                              : item.status === "community_verified"
                              ? "bg-cyan-50 text-cyan-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {item.status === "approved"
                            ? "已通过"
                            : item.status === "need_supplement"
                            ? "待补件"
                            : item.status === "pending_manual"
                            ? "待人工"
                            : item.status === "community_verified"
                            ? "已核"
                            : "待审核"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-500">别名</span>
                        {!isEditing && (
                          <button
                            onClick={() => startEditAliases(loc)}
                            className="text-xs text-night-500 hover:text-night-700 flex items-center gap-0.5"
                          >
                            <Edit2 className="w-3 h-3" />
                            编辑
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {aliasDraft.map((a, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs"
                              >
                                {a}
                                <button
                                  onClick={() =>
                                    setAliasDraft(aliasDraft.filter((_, i) => i !== idx))
                                  }
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => saveAliases(loc.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-night-500 text-white rounded text-xs hover:bg-night-700"
                            >
                              <Check className="w-3 h-3" />
                              保存
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 border border-slate-200 text-slate-600 rounded text-xs hover:bg-slate-50"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {loc.aliases.length === 0 ? (
                            <span className="text-xs text-slate-400">暂无别名</span>
                          ) : (
                            loc.aliases.map((a, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                              >
                                {a}
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        onClick={() => handleCheckCoord(loc)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        检查坐标偏移
                      </button>
                      {check && (
                        <div
                          className={`mt-2 p-2 rounded text-xs ${
                            check.valid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {check.valid ? "✓ 坐标正常，在边界内" : `⚠ ${check.reason || "疑似偏移"}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative w-[440px] bg-white rounded-lg shadow-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">新增点位</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  点位名称 *
                </label>
                <input
                  type="text"
                  value={createForm.canonicalName}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, canonicalName: e.target.value }))
                  }
                  placeholder="如：王府井小吃街北段"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  别名（逗号分隔）
                </label>
                <input
                  type="text"
                  value={createForm.aliases}
                  onChange={(e) => setCreateForm((f) => ({ ...f, aliases: e.target.value }))}
                  placeholder="如：王府井北夜市, 王府井外摆北区"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    经度 lng *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={createForm.lng}
                    onChange={(e) => setCreateForm((f) => ({ ...f, lng: e.target.value }))}
                    placeholder="如：116.4040"
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    纬度 lat *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={createForm.lat}
                    onChange={(e) => setCreateForm((f) => ({ ...f, lat: e.target.value }))}
                    placeholder="如：39.9150"
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-night-300 focus:ring-2 focus:ring-night-100 outline-none text-sm font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-100"
              >
                取消
              </button>
              <button
                onClick={() => void handleCreate()}
                className="px-4 py-2 bg-night-500 text-white rounded-md text-sm hover:bg-night-700"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
