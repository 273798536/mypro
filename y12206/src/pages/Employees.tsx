import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  UserCircle,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmployeeStore, useChangeLogStore } from "@/stores/employeeStore";

export default function Employees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } =
    useEmployeeStore();
  const { getLogsByEntity } = useChangeLogStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resigned">(
    "all"
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    employeeNo: "",
    name: "",
    department: "",
    status: "active" as "active" | "resigned",
    baseInfo: { position: "", entryDate: "" },
  });

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.employeeNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddEmployee = () => {
    if (!newEmployee.employeeNo || !newEmployee.name || !newEmployee.department)
      return;
    addEmployee(newEmployee);
    setNewEmployee({
      employeeNo: "",
      name: "",
      department: "",
      status: "active",
      baseInfo: { position: "", entryDate: "" },
    });
    setShowAddModal(false);
  };

  const selectedEmployeeData = selectedEmployee
    ? employees.find((e) => e.id === selectedEmployee)
    : null;
  const employeeLogs = selectedEmployee
    ? getLogsByEntity("employee", selectedEmployee)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">员工档案</h1>
          <p className="text-slate-500 mt-1">管理员工基本信息与状态变更</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增员工
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索工号、姓名、部门..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "resigned")
            }
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="active">在职</option>
            <option value="resigned">已离职</option>
          </select>
        </div>

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
                  部门
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  职位
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  最后更新
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedEmployee(employee.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">
                    {employee.employeeNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-medium text-sm">
                          {employee.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-800">
                        {employee.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {employee.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {employee.baseInfo.position || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        employee.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {employee.status === "active" ? "在职" : "已离职"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(employee.updatedAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEmployee(employee.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">没有找到匹配的员工</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                新增员工
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  工号
                </label>
                <input
                  type="text"
                  value={newEmployee.employeeNo}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, employeeNo: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  姓名
                </label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  部门
                </label>
                <input
                  type="text"
                  value={newEmployee.department}
                  onChange={(e) =>
                    setNewEmployee({ ...newEmployee, department: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  职位
                </label>
                <input
                  type="text"
                  value={newEmployee.baseInfo.position}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      baseInfo: {
                        ...newEmployee.baseInfo,
                        position: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  入职日期
                </label>
                <input
                  type="date"
                  value={newEmployee.baseInfo.entryDate}
                  onChange={(e) =>
                    setNewEmployee({
                      ...newEmployee,
                      baseInfo: {
                        ...newEmployee.baseInfo,
                        entryDate: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg transition-colors"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && selectedEmployeeData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-bold text-xl">
                    {selectedEmployeeData.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {selectedEmployeeData.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedEmployeeData.employeeNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">部门</p>
                    <p className="font-medium text-slate-800">
                      {selectedEmployeeData.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserCircle className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">职位</p>
                    <p className="font-medium text-slate-800">
                      {selectedEmployeeData.baseInfo.position || "-"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">入职日期</p>
                    <p className="font-medium text-slate-800">
                      {selectedEmployeeData.baseInfo.entryDate || "-"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">状态</p>
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      selectedEmployeeData.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {selectedEmployeeData.status === "active" ? "在职" : "已离职"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-3">变更时间线</h4>
                <div className="space-y-3">
                  {employeeLogs.length > 0 ? (
                    employeeLogs.map((log) => (
                      <div key={log.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-accent-500 rounded-full" />
                          <div className="w-px h-full bg-slate-200" />
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-slate-700">
                            {log.field} 变更
                          </p>
                          <p className="text-xs text-slate-500">
                            从 "{log.oldValue}" 改为 "{log.newValue}"
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(log.timestamp).toLocaleString("zh-CN")} ·{" "}
                            {log.operator}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">暂无变更记录</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
