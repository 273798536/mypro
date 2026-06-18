import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  Search,
  Filter,
  ChevronRight,
  AlertTriangle,
  Eye,
  Layers,
} from 'lucide-react';
import { getStatusLabel, getStatusColor, formatDate } from '@/utils/format';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function Samples() {
  const { samples } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSamples = samples.filter((sample) => {
    const matchesSearch =
      sample.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || sample.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'approved', label: '已放行' },
    { value: 'rejected', label: '已驳回' },
    { value: 'leak_suspected', label: '疑似泄漏' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="搜索作文标题、学生姓名、学号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue-500/30 focus:border-accent-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue-500/30 focus:border-accent-blue-500 bg-white"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button variant="primary">
            <Layers size={16} />
            上传样本表
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  作文标题
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  学生
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  年级
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  当前版本
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  分数
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  状态
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  更新时间
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSamples.map((sample, index) => {
                const currentVersion = sample.versions[sample.versions.length - 1];
                return (
                  <tr
                    key={sample.id}
                    className={clsx(
                      'hover:bg-gray-50 transition-colors cursor-pointer',
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                    onClick={() => navigate(`/samples/${sample.id}`)}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {sample.isLeakSuspected && (
                          <AlertTriangle
                            size={16}
                            className="text-status-warning flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {sample.title}
                          </p>
                          {sample.isLeakSuspected && sample.leakReason && (
                            <p className="text-xs text-status-warning mt-0.5">
                              {sample.leakReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700">
                        {sample.studentName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sample.studentId}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {sample.grade}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="info">v{sample.currentVersion}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono font-semibold text-deep-blue-500">
                        {currentVersion.score}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">
                        / 100
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border',
                          getStatusColor(sample.status)
                        )}
                      >
                        {getStatusLabel(sample.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDate(sample.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/samples/${sample.id}`);
                        }}
                        className="inline-flex items-center gap-1 text-sm text-accent-blue-500 hover:text-accent-blue-600 transition-colors"
                      >
                        <Eye size={14} />
                        查看
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSamples.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-400">没有找到匹配的样本</p>
          </div>
        )}
      </Card>
    </div>
  );
}
