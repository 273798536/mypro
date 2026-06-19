import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, ExternalLink, FileText, ArrowRight } from 'lucide-react';
import { useAuditStore } from '@/stores/auditStore';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import { formatDateTime } from '@/utils/format';

export default function AuditPage() {
  const navigate = useNavigate();
  const { permissions, roles, resources, fetchPermissions, fetchRolesAndResources } = useAuditStore();

  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  useEffect(() => {
    fetchPermissions({ keyword: keyword || undefined, roleName: roleFilter || undefined, resource: resourceFilter || undefined });
    fetchRolesAndResources();
  }, [keyword, roleFilter, resourceFilter, fetchPermissions, fetchRolesAndResources]);

  const groupedByRole = permissions.reduce((acc, perm) => {
    if (!acc[perm.roleName]) {
      acc[perm.roleName] = [];
    }
    acc[perm.roleName].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const conclusionGaps = [
    { id: 'gap_003', title: '用户行为日志表分区异常', conclusion: '已重新创建缺失分区...', status: 'fixed' },
    { id: 'gap_004', title: '支付流水表采样频率异常', conclusion: '经核实为业务高峰期正常波动...', status: 'ignored' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-emerald-400" size={24} />
            权限审计
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            日常入口：权限清单与结论回溯
          </p>
        </div>
        <Button variant="secondary" icon={<ExternalLink size={16} />}>
          导出审计报告
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {permissions.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">权限条目</div>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {roles.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">角色数量</div>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-indigo-400 font-mono">
            {resources.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">资源数量</div>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {conclusionGaps.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">已结论缺口</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="权限清单"
            subtitle={`共 ${permissions.length} 条权限记录`}
          >
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="搜索权限、角色、资源..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">全部角色</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">全部资源</option>
                {resources.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {Object.keys(groupedByRole).length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  暂无权限数据
                </div>
              ) : (
                Object.entries(groupedByRole).map(([role, perms]) => (
                  <div key={role} className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800">
                      <span className="text-sm font-medium text-slate-200">{role}</span>
                      <span className="text-xs text-slate-500 ml-2">{perms.length} 条权限</span>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                      {perms.map((perm) => (
                        <div
                          key={perm.id}
                          className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                        >
                          <div>
                            <div className="font-mono text-sm text-slate-300">
                              {perm.permission}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              资源: {perm.resource} · 授权人: {perm.grantedBy}
                            </div>
                          </div>
                          {perm.gapId && (
                            <button
                              onClick={() => navigate(`/gaps/${perm.gapId}`)}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                            >
                              关联缺口
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="结论回溯" subtitle="从结论回看缺口报告">
            <div className="space-y-3">
              {conclusionGaps.map((gap) => (
                <div
                  key={gap.id}
                  onClick={() => navigate(`/gaps/${gap.id}`)}
                  className="p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                        {gap.title}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {gap.conclusion}
                      </p>
                    </div>
                    <FileText size={16} className="text-slate-500 group-hover:text-blue-400 shrink-0 mt-0.5" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-emerald-400">已结论</span>
                    <span className="text-xs text-slate-600">点击查看详情 →</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="审计提示">
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                  <span className="font-medium">月底审计：</span>
                  每月底检查缺口报告的迁移状态是否能解释清楚，确保采样数据完整可追溯。
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-300">
                  <span className="font-medium">课前检查：</span>
                  课前回看表结构快照和权限清单，确认系统状态符合预期。
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-xs text-emerald-300">
                  <span className="font-medium">日常维护：</span>
                  平时通过此入口整理表结构快照，出问题时可快速回看业务工单。
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
