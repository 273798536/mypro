import { Sample } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { AlertCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SampleListProps {
  samples: Sample[];
}

export const SampleList = ({ samples }: SampleListProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-secondary/50 rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full">
        <thead className="bg-primary/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              素材名称
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              来源
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              格式
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              时长
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              创建日期
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              状态
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {samples.map((sample) => (
            <tr
              key={sample.id}
              className="hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => navigate(`/samples/${sample.id}`)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {sample.name}
                  </span>
                  {sample.isDuplicate && (
                    <AlertCircle
                      className="w-4 h-4 text-warning"
                      title="存在重名素材"
                    />
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-300">{sample.source}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-300">{sample.format}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-300">{sample.duration} 秒</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-300">
                  {formatDate(sample.createdAt)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {sample.isDuplicate ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
                    重名警告
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                    正常
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/samples/${sample.id}`);
                  }}
                  className="text-accent hover:text-accent/80 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
