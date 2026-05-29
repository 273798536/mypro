import type { AllocationResult, AllocationDiff } from "../../shared/types";

interface CompareTableProps {
  oldResults: AllocationResult[];
  newResults: AllocationResult[];
  diffs: AllocationDiff[];
}

export default function CompareTable({
  oldResults,
  newResults,
  diffs,
}: CompareTableProps) {
  const diffKeys = new Set(
    diffs.map((d) => `${d.cardNo}-${d.scenicSpotId}`)
  );

  const totalDiffAmount = diffs.reduce((sum, d) => sum + d.diffAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-danger/5 border border-danger/20 rounded-lg px-4 py-3">
        <span className="text-sm text-danger font-medium">
          {diffs.length}条记录变化
        </span>
        <span className="text-sm text-danger">
          总差异金额 ¥{totalDiffAmount.toFixed(2)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b text-sm font-medium text-gray-600">
            旧版本
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 px-3">年卡号</th>
                  <th className="text-left py-2 px-3">景点</th>
                  <th className="text-right py-2 px-3">入园次数</th>
                  <th className="text-right py-2 px-3">合计分摊</th>
                </tr>
              </thead>
              <tbody>
                {oldResults.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b ${
                      diffKeys.has(`${r.cardNo}-${r.scenicSpotId}`)
                        ? "bg-danger/10"
                        : ""
                    }`}
                  >
                    <td className="py-2 px-3">{r.cardNo}</td>
                    <td className="py-2 px-3">{r.scenicSpotName}</td>
                    <td className="py-2 px-3 text-right">{r.entryCount}</td>
                    <td className="py-2 px-3 text-right font-display">
                      ¥{r.totalAllocation.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b text-sm font-medium text-gray-600">
            新版本
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-2 px-3">年卡号</th>
                  <th className="text-left py-2 px-3">景点</th>
                  <th className="text-right py-2 px-3">入园次数</th>
                  <th className="text-right py-2 px-3">合计分摊</th>
                </tr>
              </thead>
              <tbody>
                {newResults.map((r) => {
                  const isDiff = diffKeys.has(
                    `${r.cardNo}-${r.scenicSpotId}`
                  );
                  const diff = diffs.find(
                    (d) =>
                      d.cardNo === r.cardNo &&
                      d.scenicSpotId === r.scenicSpotId
                  );
                  return (
                    <tr
                      key={r.id}
                      className={`border-b ${
                        isDiff ? "bg-danger/10" : ""
                      }`}
                    >
                      <td className="py-2 px-3">{r.cardNo}</td>
                      <td className="py-2 px-3">{r.scenicSpotName}</td>
                      <td className="py-2 px-3 text-right">{r.entryCount}</td>
                      <td className="py-2 px-3 text-right">
                        <span className="font-display">
                          ¥{r.totalAllocation.toFixed(2)}
                        </span>
                        {isDiff && diff && (
                          <span
                            className={`ml-2 inline-block px-1.5 py-0.5 rounded text-xs ${
                              diff.diffAmount > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-danger/10 text-danger"
                            }`}
                          >
                            {diff.diffAmount > 0 ? "+" : ""}
                            ¥{diff.diffAmount.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
