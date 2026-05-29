import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, LogIn, Gift, Tag, ChevronDown, ChevronUp, Calculator } from "lucide-react";
import { useStore } from "@/store/useStore";
import UploadZone from "@/components/UploadZone";
import StatusCard from "@/components/StatusCard";

export default function ImportPage() {
  const navigate = useNavigate();
  const {
    importStatus,
    importLoading,
    importError,
    importChangeSummary,
    fetchImportStatus,
    importAccounts,
    importEntries,
    importSubsidies,
    calculateAllocation,
    allocationLoading,
  } = useStore();

  const [accountResult, setAccountResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
  } | null>(null);
  const [entryResult, setEntryResult] = useState<{
    success: boolean;
    count?: number;
    duplicates?: number;
    error?: string;
  } | null>(null);
  const [subsidyResult, setSubsidyResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
  } | null>(null);
  const [showChangeDetail, setShowChangeDetail] = useState(false);

  useEffect(() => {
    fetchImportStatus();
  }, [fetchImportStatus]);

  const handleImportAccounts = async (file: File) => {
    try {
      await importAccounts(file);
      setAccountResult({ success: true });
    } catch {
      setAccountResult({ success: false, error: "导入失败" });
    }
  };

  const handleImportEntries = async (file: File) => {
    try {
      await importEntries(file);
      setEntryResult({ success: true });
    } catch {
      setEntryResult({ success: false, error: "导入失败" });
    }
  };

  const handleImportSubsidies = async (file: File) => {
    try {
      await importSubsidies(file);
      setSubsidyResult({ success: true });
    } catch {
      setSubsidyResult({ success: false, error: "导入失败" });
    }
  };

  const handleCalculate = async () => {
    await calculateAllocation();
    navigate("/dashboard");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-primary">数据导入</h2>
        <p className="text-sm text-gray-500 mt-1">
          按步骤导入年卡账户、入园记录和活动补贴数据
        </p>
      </div>

      {importError && (
        <div className="bg-danger/10 border border-danger/20 text-danger rounded-lg px-4 py-3 text-sm">
          {importError}
        </div>
      )}

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
            1
          </span>
          <h3 className="font-medium text-primary">年卡账户与入园记录</h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <UploadZone
            title="年卡账户上传"
            onUpload={handleImportAccounts}
            loading={importLoading && accountResult === null}
            result={accountResult}
          />
          <UploadZone
            title="入园记录上传"
            onUpload={handleImportEntries}
            loading={importLoading && entryResult === null}
            result={entryResult}
          />
        </div>
        {entryResult?.success && entryResult.duplicates !== undefined && (
          <div className="mt-4 bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-sm text-accent">
            去重结果：{entryResult.duplicates}条重复刷卡已标记
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
            2
          </span>
          <h3 className="font-medium text-primary">活动补贴</h3>
        </div>
        <UploadZone
          title="活动补贴上传"
          onUpload={handleImportSubsidies}
          loading={importLoading && subsidyResult === null}
          result={subsidyResult}
        />
        {importChangeSummary && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-6 text-sm">
                <span className="text-green-600">
                  新增 {importChangeSummary.added} 条
                </span>
                <span className="text-accent">
                  变更 {importChangeSummary.updated} 条
                </span>
                <span className="text-danger">
                  删除 {importChangeSummary.removed} 条
                </span>
              </div>
              {importChangeSummary.details.length > 0 && (
                <button
                  onClick={() => setShowChangeDetail(!showChangeDetail)}
                  className="text-xs text-primary flex items-center gap-1"
                >
                  {showChangeDetail ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  明细
                </button>
              )}
            </div>
            {showChangeDetail && importChangeSummary.details.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="text-left py-1">操作</th>
                      <th className="text-left py-1">活动ID</th>
                      <th className="text-left py-1">活动名称</th>
                      <th className="text-left py-1">景点</th>
                      <th className="text-right py-1">补贴金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importChangeSummary.details.map((d, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              d.action === "added"
                                ? "bg-green-100 text-green-700"
                                : d.action === "updated"
                                ? "bg-accent/10 text-accent"
                                : "bg-danger/10 text-danger"
                            }`}
                          >
                            {d.action === "added"
                              ? "新增"
                              : d.action === "updated"
                              ? "变更"
                              : "删除"}
                          </span>
                        </td>
                        <td className="py-1">{d.activityId}</td>
                        <td className="py-1">{d.activityName}</td>
                        <td className="py-1">{d.scenicSpotName}</td>
                        <td className="py-1 text-right">
                          ¥{d.subsidyAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="font-medium text-primary mb-4">当前数据状态</h3>
        <div className="grid grid-cols-4 gap-4">
          <StatusCard
            label="年卡账户数"
            value={importStatus?.accountCount ?? "-"}
            icon={<Users size={18} />}
          />
          <StatusCard
            label="入园记录数"
            value={importStatus?.entryCount ?? "-"}
            icon={<LogIn size={18} />}
          />
          <StatusCard
            label="活动补贴数"
            value={importStatus?.subsidyCount ?? "-"}
            icon={<Gift size={18} />}
          />
          <StatusCard
            label="最新版本"
            value={importStatus?.latestVersion ?? "-"}
            icon={<Tag size={18} />}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleCalculate}
          disabled={allocationLoading}
          className="bg-primary text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Calculator size={16} />
          {allocationLoading ? "计算中..." : "开始计算"}
        </button>
      </div>
    </div>
  );
}
