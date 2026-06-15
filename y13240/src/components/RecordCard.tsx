import { Music, Calendar, MessageSquare, Image, Clock, ChevronRight } from 'lucide-react';
import { StallRecord, STATUS_LABELS } from '@/types';
import { formatDate, isAuthorizationExpiring, isAuthorizationExpired } from '@/utils/fileParser';
import { useStore } from '@/store';

interface RecordCardProps {
  record: StallRecord;
  onClick: () => void;
}

export default function RecordCard({ record, onClick }: RecordCardProps) {
  const versions = useStore((state) => state.versions);
  const screenshots = useStore((state) => state.screenshots);
  
  const recordVersions = versions.filter((v) => v.recordId === record.id);
  const currentVersion = recordVersions.find((v) => v.id === record.currentVersionId);
  const recordScreenshots = screenshots.filter((s) => s.recordId === record.id);

  const statusClass = `status-${record.status}`;
  const versionCount = recordVersions.length;
  const hasMultipleVersions = versionCount > 1;

  const authWarning = currentVersion?.authorizationDate
    ? isAuthorizationExpired(currentVersion.authorizationDate)
      ? 'expired'
      : isAuthorizationExpiring(currentVersion.authorizationDate)
      ? 'expiring'
      : null
    : 'missing';

  return (
    <div
      className={`card p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group
        ${authWarning === 'expired' ? 'ring-2 ring-red-400 animate-pulse-soft' : ''}
        ${authWarning === 'expiring' ? 'gradient-border-expiring' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-12 rounded-full ${
            record.status === 'pending' ? 'bg-status-pending' :
            record.status === 'confirmed' ? 'bg-status-confirmed' :
            record.status === 'withdrawn' ? 'bg-status-withdrawn' :
            'bg-status-annotated'
          }`} />
          <div>
            <h3 className="font-serif text-xl font-bold text-gray-900">
              摊位 {record.stallNumber}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`status-badge ${statusClass}`}>
                {STATUS_LABELS[record.status]}
              </span>
              {hasMultipleVersions && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  <Clock className="w-3 h-3" />
                  v{versionCount}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
      </div>

      {currentVersion && (
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-gray-400" />
            <span className="truncate max-w-[200px]">{currentVersion.audioFileName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${
              authWarning === 'expired' ? 'text-red-500' :
              authWarning === 'expiring' ? 'text-amber-500' :
              authWarning === 'missing' ? 'text-gray-400' :
              'text-gray-400'
            }`} />
            <span className={
              authWarning === 'expired' ? 'text-red-600 font-medium' :
              authWarning === 'expiring' ? 'text-amber-600 font-medium' :
              authWarning === 'missing' ? 'text-gray-400' :
              ''
            }>
              {currentVersion.authorizationDate
                ? `授权至 ${formatDate(currentVersion.authorizationDate)}`
                : '未设置授权期限'}
            </span>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{record.latestCommentId ? '有批注' : '无批注'}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Image className="w-3.5 h-3.5" />
              <span>{recordScreenshots.length} 张截图</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
        <span>更新于 {new Date(record.updatedAt).toLocaleDateString('zh-CN')}</span>
        <span className="text-primary font-medium group-hover:underline">查看详情</span>
      </div>
    </div>
  );
}
