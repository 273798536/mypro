import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Wallet,
  Plus,
  ChevronRight,
  Calendar,
  Users,
  AlertCircle,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployeeStore } from "@/stores/employeeStore";
import { useSalaryStore } from "@/stores/salaryStore";

export default function Salary() {
  const { salaryRecords, getAvailableMonths, getRecordsByMonth } =
    useSalaryStore();
  const { employees } = useEmployeeStore();

  const months = getAvailableMonths();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">工资表</h1>
          <p className="text-slate-500 mt-1">管理月度工资数据与补缴记录</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((month) => {
          const records = getRecordsByMonth(month);
          const hasBackpay = records.some((r) => r.isBackpay);
          const completeness = Math.round(
            (records.length / employees.filter((e) => e.status === "active").length) * 100
          );

          return (
            <Link
              key={month}
              to={`/salary/${month}`}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {month}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {records.length} 人
                    </span>
                    {hasBackpay && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-4 h-4" />
                        含补缴
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-accent-500 transition-colors" />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>数据完整度</span>
                  <span>{completeness}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      completeness >= 100
                        ? "bg-green-500"
                        : completeness >= 80
                        ? "bg-accent-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(completeness, 100)}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {months.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">暂无工资表数据</p>
        </div>
      )}
    </div>
  );
}

export function SalaryDetail() {
  const { month } = useParams<{ month: string }>();
  const navigate = useNavigate();
  const { employees } = useEmployeeStore();
  const {
    getRecordsByMonth,
    updateSalaryRecord,
    addSalaryRecord,
    getRecordsByEmployeeAndMonth,
  } = useSalaryStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    baseSalary: number;
    bonus: number;
    isBackpay: boolean;
  }>({ baseSalary: 0, bonus: 0, isBackpay: false });

  if (!month) return null;

  const records = getRecordsByMonth(month);
  const activeEmployees = employees.filter((e) => e.status === "active");

  const handleEdit = (recordId: string) => {
    const record = records.find((r) => r.id === recordId);
    if (record) {
      setEditData({
        baseSalary: record.baseSalary,
        bonus: record.bonus,
        isBackpay: record.isBackpay,
      });
      setEditingId(recordId);
    }
  };

  const handleSave = () => {
    if (editingId) {
      updateSalaryRecord(editingId, {
        ...editData,
        totalSalary: editData.baseSalary + editData.bonus,
      });
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/salary")}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{month} 工资明细</h1>
          <p className="text-slate-500 mt-1">共 {records.length} 条记录</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  工号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  基本工资
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  奖金
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  工资总额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  补缴标记
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {records.map((record) => {
                const employee = employees.find(
                  (e) => e.id === record.employeeId
                );
                const isEditing = editingId === record.id;

                return (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                      {employee?.employeeNo || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-800">
                        {employee?.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.baseSalary}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              baseSalary: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 border border-slate-300 rounded"
                        />
                      ) : (
                        `¥${record.baseSalary.toLocaleString()}`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.bonus}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              bonus: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 border border-slate-300 rounded"
                        />
                      ) : (
                        `¥${record.bonus.toLocaleString()}`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      ¥
                      {(
                        (isEditing
                          ? editData.baseSalary + editData.bonus
                          : record.totalSalary
                        ).toLocaleString())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editData.isBackpay}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                isBackpay: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm text-slate-600">是</span>
                        </label>
                      ) : record.isBackpay ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                          补缴
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isEditing ? (
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEdit(record.id)}
                          className="text-accent-600 hover:text-accent-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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
  );
}
