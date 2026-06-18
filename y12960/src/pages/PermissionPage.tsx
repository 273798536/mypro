import { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  Settings,
  Edit,
  Save,
  X,
  Check,
  AlertCircle,
  Clock,
  User,
} from 'lucide-react';
import { permissionApi } from '../api/client';
import { roleConfig, formatDate } from '../utils/formatters';

interface PermissionItem {
  resource: string;
  action: string;
  name: string;
  description: string;
}

export function PermissionPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'permissions' | 'audit'>('roles');
  const [roles, setRoles] = useState<Array<{ id: string; name: string; displayInfo: { name: string; color: string; description: string }; permissions: Array<{ resource: string; action: string; name: string; description: string; granted: boolean }> }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; roleDisplay: { name: string; color: string; description: string }; createdAt: string }>>([]);
  const [permissionList, setPermissionList] = useState<PermissionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; resource: string; details: string; createdAt: string; user: { name: string } }>>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'roles') {
        const res = await permissionApi.getRoles();
        if (res.success) setRoles(res.data);
      } else if (activeTab === 'users') {
        const res = await permissionApi.getUsers();
        if (res.success) setUsers(res.data);
      } else if (activeTab === 'permissions') {
        const res = await permissionApi.getPermissionList();
        if (res.success) setPermissionList(res.data);
      } else if (activeTab === 'audit') {
        const res = await permissionApi.getAuditLog(1, 50);
        if (res.success) setAuditLogs(res.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const startEditRole = (role: { id: string; permissions: Array<{ resource: string; action: string; granted: boolean }> }) => {
    setEditingRole(role.id);
    setEditingPermissions(new Set(role.permissions.filter((p) => p.granted).map((p) => `${p.resource}:${p.action}`)));
  };

  const togglePermission = (key: string) => {
    setEditingPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const saveRolePermissions = async (roleId: string) => {
    try {
      const permissions = Array.from(editingPermissions);
      const res = await permissionApi.updateRolePermissions(roleId, permissions);
      if (res.success) {
        setEditingRole(null);
        loadData();
      }
    } catch (error) {
      console.error('保存权限失败:', error);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const res = await permissionApi.updateUserRole(userId, role);
      if (res.success) {
        loadData();
      }
    } catch (error) {
      console.error('更新用户角色失败:', error);
    }
  };

  const tabs = [
    { id: 'roles' as const, label: '角色管理', icon: Shield },
    { id: 'users' as const, label: '用户管理', icon: Users },
    { id: 'permissions' as const, label: '权限清单', icon: Settings },
    { id: 'audit' as const, label: '审计日志', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          权限管理
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          管理系统角色、用户权限配置和操作审计记录
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              {roles.map((role) => {
                const isEditing = editingRole === role.id;
                const roleConfigInfo = roleConfig[role.name] || { label: role.displayInfo?.name || role.name, className: 'bg-gray-100 text-gray-800', color: '#6B7280' };

                return (
                  <div key={role.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: roleConfigInfo.color }}
                        >
                          {role.displayInfo?.name?.[0] || role.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {role.displayInfo?.name || role.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {role.displayInfo?.description || ''}
                          </p>
                        </div>
                      </div>
                      {!isEditing ? (
                        <button
                          onClick={() => startEditRole(role)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          编辑权限
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveRolePermissions(role.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            保存
                          </button>
                          <button
                            onClick={() => setEditingRole(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        {role.permissions.map((perm, idx) => {
                          const key = `${perm.resource}:${perm.action}`;
                          const isChecked = isEditing ? editingPermissions.has(key) : perm.granted;

                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                isChecked
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-gray-50 border-gray-200'
                              } ${isEditing ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                              onClick={() => isEditing && togglePermission(key)}
                            >
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white border-gray-300'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm ${isChecked ? 'text-blue-800' : 'text-gray-700'}`}>
                                  {perm.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{perm.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      邮箱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: user.roleDisplay?.color || '#6B7280' }}
                          >
                            {user.name?.[0] || 'U'}
                          </div>
                          <span className="font-medium text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            user.roleDisplay?.className || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.roleDisplay?.name || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="admin">管理员</option>
                          <option value="bi_analyst">BI分析师</option>
                          <option value="dev">研发团队</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">权限清单说明</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      以下是系统中所有可用的权限项。权限按资源（Resource）和操作（Action）组合，
                      通过角色分配给用户。
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        资源
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        权限名称
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        说明
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {permissionList.map((perm, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                            {perm.resource}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            perm.action === 'create' ? 'bg-green-100 text-green-700' :
                            perm.action === 'read' ? 'bg-blue-100 text-blue-700' :
                            perm.action === 'update' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {perm.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{perm.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{perm.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{log.user?.name || '系统'}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-sm text-gray-500">{formatDate(log.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">
                      <span className="font-medium">{log.action}</span>
                      {' - '}
                      {log.details}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      资源：{log.resource}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
