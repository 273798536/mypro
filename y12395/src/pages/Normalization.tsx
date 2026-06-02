import { useEffect, useState } from "react";
import { CheckCircle2, Clock, ChevronDown, ChevronUp, RotateCcw, GitMerge, AlertCircle } from "lucide-react";
import { useStore, AliasGroup } from "@/store";

function AliasGroupRow({
  group,
  onNormalize,
}: {
  group: AliasGroup;
  onNormalize: (groupId: string, targetName: string, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [targetName, setTargetName] = useState(group.standardName);
  const [reason, setReason] = useState("");

  const handleNormalize = () => {
    if (!targetName || !reason) return;
    onNormalize(group.id, targetName, reason);
    setExpanded(false);
    setReason("");
  };

  return (
    <div className="border-b border-gutong/10 last:border-b-0">
      <div
        className="grid grid-cols-12 gap-4 px-5 py-4 items-center cursor-pointer hover:bg-gutong/5 transition-all duration-200"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="col-span-3 font-serif font-semibold text-mohei">
          {group.standardName}
        </div>
        <div className="col-span-4 flex flex-wrap gap-1">
          {group.aliases.map((alias) => (
            <span
              key={alias}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gutong/10 text-gutong font-serif"
            >
              {alias}
            </span>
          ))}
        </div>
        <div className="col-span-3 flex flex-wrap gap-1">
          {group.versions.map((v) => (
            <span
              key={v}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dianlan/10 text-dianlan font-serif"
            >
              {v}
            </span>
          ))}
        </div>
        <div className="col-span-2 flex items-center justify-between">
          {group.normalized ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 font-serif">
              <CheckCircle2 size={12} />
              已归一
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 font-serif">
              <Clock size={12} />
              待归一
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 bg-gutong/5">
          <h4 className="font-serif text-sm font-semibold text-mohei mb-3 flex items-center gap-2">
            <GitMerge size={16} className="text-gutong" />
            归一操作
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-gray-500 font-serif mb-1">目标名称</label>
              <select
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-white transition-all duration-200"
              >
                <option value={group.standardName}>{group.standardName}</option>
                {group.aliases.map((alias) => (
                  <option key={alias} value={alias}>
                    {alias}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-serif mb-1">归一原因</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gutong/30 text-sm font-serif focus:outline-none focus:border-gutong bg-white transition-all duration-200"
                placeholder="输入归一原因..."
              />
            </div>
          </div>
          <button
            onClick={handleNormalize}
            disabled={!targetName || !reason}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-gutong text-white hover:bg-gutong/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-serif text-sm"
          >
            <GitMerge size={16} />
            确认归一
          </button>
        </div>
      )}
    </div>
  );
}

export default function Normalization() {
  const {
    aliasGroups,
    aliasGroupsLoading,
    changeHistory,
    changeHistoryLoading,
    fetchAliasGroups,
    fetchChangeHistory,
    normalizeGroup,
    rollbackSnapshot,
  } = useStore();

  useEffect(() => {
    fetchAliasGroups();
    fetchChangeHistory();
  }, [fetchAliasGroups, fetchChangeHistory]);

  const operationLabels: Record<string, string> = {
    normalize: "归一",
    rollback: "回滚",
    update: "更新",
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-mohei">指法归一</h2>
        <p className="text-sm text-gray-500 font-serif mt-1">
          管理指法异名归一与变更历史
        </p>
      </div>

      <div className="bg-white rounded-md shadow-warm mb-8">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-gutong/10 bg-gutong/5">
          <div className="col-span-3 text-xs text-gray-500 font-serif font-semibold">标准名</div>
          <div className="col-span-4 text-xs text-gray-500 font-serif font-semibold">异名列表</div>
          <div className="col-span-3 text-xs text-gray-500 font-serif font-semibold">涉及版本</div>
          <div className="col-span-2 text-xs text-gray-500 font-serif font-semibold">归一状态</div>
        </div>

        {aliasGroupsLoading ? (
          <div className="text-center py-12 text-gray-400 font-serif">加载中...</div>
        ) : aliasGroups.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={36} className="mx-auto text-gutong/30 mb-3" />
            <p className="text-gray-400 font-serif">暂无归一组</p>
          </div>
        ) : (
          aliasGroups.map((group) => (
            <AliasGroupRow
              key={group.id}
              group={group}
              onNormalize={normalizeGroup}
            />
          ))
        )}
      </div>

      <div>
        <h3 className="font-serif font-semibold text-mohei text-lg mb-4">变更历史</h3>
        {changeHistoryLoading ? (
          <div className="text-center py-8 text-gray-400 font-serif">加载中...</div>
        ) : changeHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-serif">暂无变更记录</div>
        ) : (
          <div className="space-y-3">
            {changeHistory.map((snapshot) => (
              <div
                key={snapshot.id}
                className="bg-white rounded-md shadow-warm p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-gutong shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-serif">
                        {new Date(snapshot.timestamp).toLocaleString("zh-CN")}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-dianlan/10 text-dianlan font-serif">
                        {operationLabels[snapshot.operationType] || snapshot.operationType}
                      </span>
                    </div>
                    <p className="text-sm text-mohei font-serif mt-1">
                      {snapshot.affectedGroupName} — {snapshot.reason}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => rollbackSnapshot(snapshot.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-zhusha/30 text-zhusha hover:bg-zhusha/10 transition-all duration-200 font-serif text-xs"
                >
                  <RotateCcw size={12} />
                  回滚
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
