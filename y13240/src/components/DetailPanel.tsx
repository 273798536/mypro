import { useState } from 'react';
import {
  X,
  Music,
  Calendar,
  MessageSquare,
  Image,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Download,
  Plus,
} from 'lucide-react';
import { useStore } from '@/store';
import type {
  Version as VersionType,
  Comment as CommentType_,
  Screenshot as ScreenshotType,
} from '@/types';
import {
  STATUS_LABELS,
  CommentType,
} from '@/types';
import {
  formatDate,
  formatDateTime,
  isAuthorizationExpiring,
  isAuthorizationExpired,
} from '@/utils/fileParser';
import ConfirmModal from './modals/ConfirmModal';
import CommentModal from './modals/CommentModal';
import ScreenshotModal from './modals/ScreenshotModal';

interface DetailPanelProps {
  recordId: string;
  onClose: () => void;
}

type TabType = 'versions' | 'comments' | 'screenshots';

export default function DetailPanel({ recordId, onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('versions');
  const [showConfirmModal, setShowConfirmModal] = useState<'confirm' | 'withdraw' | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  const details = useStore((state) => state.getRecordWithDetails(recordId));
  const confirmRecord = useStore((state) => state.confirmRecord);
  const withdrawRecord = useStore((state) => state.withdrawRecord);
  const addComment = useStore((state) => state.addComment);
  const addScreenshot = useStore((state) => state.addScreenshot);

  const { record, versions: recordVersions, comments, screenshots, currentVersion, latestComment } = details;

  if (!record) return null;

  const authWarning = currentVersion?.authorizationDate
    ? isAuthorizationExpired(currentVersion.authorizationDate)
      ? 'expired'
      : isAuthorizationExpiring(currentVersion.authorizationDate)
      ? 'expiring'
      : null
    : 'missing';

  const handleConfirm = (comment: string, author: string) => {
    confirmRecord(recordId, comment, author);
    setShowConfirmModal(null);
  };

  const handleWithdraw = (reason: string, author: string) => {
    withdrawRecord(recordId, reason, author);
    setShowConfirmModal(null);
  };

  const handleAddComment = (content: string, author: string, type: CommentType) => {
    addComment(recordId, currentVersion?.id || '', content, author, type);
    setShowCommentModal(false);
  };

  const handleAddScreenshot = (uploads: { dataUrl: string; description: string }[]) => {
    uploads.forEach((upload) => {
      addScreenshot(recordId, currentVersion?.id || '', upload.dataUrl, upload.description);
    });
    setShowScreenshotModal(false);
  };

  const statusClass = `status-${record.status}`;
  const hasExistingConfirmation = record.status === 'confirmed' || record.status === 'annotated';

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'versions', label: '版本时间线', icon: <Clock className="w-4 h-4" />, count: recordVersions.length },
    { key: 'comments', label: '人工批注', icon: <MessageSquare className="w-4 h-4" />, count: comments.length },
    { key: 'screenshots', label: '截图说明', icon: <Image className="w-4 h-4" />, count: screenshots.length },
  ];

  return (
    <>
      <div className="sidebar">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-serif text-2xl font-bold text-gray-900">
                  摊位 {record.stallNumber}
                </h2>
                <span className={`status-badge ${statusClass}`}>
                  {STATUS_LABELS[record.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                创建于 {formatDate(record.createdAt)} · 更新于 {formatDate(record.updatedAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {currentVersion && (
            <div className={`p-4 rounded-xl ${
              authWarning === 'expired'
                ? 'bg-red-50 border border-red-200'
                : authWarning === 'expiring'
                ? 'gradient-border-expiring'
                : authWarning === 'missing'
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-emerald-50 border border-emerald-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {authWarning === 'expired' ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : authWarning === 'expiring' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : authWarning === 'missing' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                <span className={`font-medium ${
                  authWarning === 'expired' ? 'text-red-800' :
                  authWarning === 'expiring' ? 'text-amber-800' :
                  authWarning === 'missing' ? 'text-amber-800' :
                  'text-emerald-800'
                }`}>
                  {authWarning === 'expired'
                    ? '授权已过期'
                    : authWarning === 'expiring'
                    ? '授权即将到期'
                    : authWarning === 'missing'
                    ? '未设置授权期限'
                    : '授权有效'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className={`w-4 h-4 ${
                  authWarning === 'expired' ? 'text-red-500' :
                  authWarning === 'expiring' ? 'text-amber-500' :
                  'text-gray-400'
                }`} />
                <span className={
                  authWarning === 'expired' ? 'text-red-700 font-medium' :
                  authWarning === 'expiring' ? 'text-amber-700 font-medium' :
                  ''
                }>
                  {currentVersion.authorizationDate
                    ? `授权至 ${formatDate(currentVersion.authorizationDate)}`
                    : '请手动补充授权期限'}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {record.status !== 'confirmed' && record.status !== 'withdrawn' && (
              <button
                onClick={() => setShowConfirmModal('confirm')}
                className="flex-1 btn-primary text-sm py-2"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                确认通过
              </button>
            )}
            {record.status === 'confirmed' && (
              <button
                onClick={() => setShowConfirmModal('withdraw')}
                className="flex-1 btn-danger text-sm py-2"
              >
                <XCircle className="w-4 h-4 inline mr-1" />
                撤回确认
              </button>
            )}
            <button
              onClick={() => setShowCommentModal(true)}
              className="btn-secondary text-sm py-2 px-3"
              title="添加批注"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowScreenshotModal(true)}
              className="btn-secondary text-sm py-2 px-3"
              title="上传截图"
            >
              <Plus className="w-4 h-4" />
              <Image className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 pb-24">
          {activeTab === 'versions' && (
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {recordVersions
                  .sort((a, b) => b.versionNumber - a.versionNumber)
                  .map((version, idx) => (
                    <VersionTimelineItem
                      key={version.id}
                      version={version}
                      isCurrent={version.id === record.currentVersionId}
                      isLatest={idx === 0}
                    />
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无批注</p>
                </div>
              ) : (
                comments
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))
              )}
            </div>
          )}

          {activeTab === 'screenshots' && (
            <div className="space-y-4">
              {screenshots.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无截图</p>
                </div>
              ) : (
                screenshots
                  .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
                  .map((screenshot) => (
                    <ScreenshotItem key={screenshot.id} screenshot={screenshot} />
                  ))
              )}
            </div>
          )}
        </div>

        {latestComment && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
            <div className="text-xs text-gray-500 mb-1">最新批注</div>
            <p className="text-sm text-gray-700 line-clamp-2">{latestComment.content}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <User className="w-3 h-3" />
              <span>{latestComment.author}</span>
              <span>·</span>
              <span>{formatDateTime(latestComment.createdAt)}</span>
            </div>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <ConfirmModal
          type={showConfirmModal}
          onConfirm={showConfirmModal === 'confirm' ? handleConfirm : handleWithdraw}
          onCancel={() => setShowConfirmModal(null)}
        />
      )}

      {showCommentModal && (
        <CommentModal
          onConfirm={handleAddComment}
          onCancel={() => setShowCommentModal(false)}
          hasExistingConfirmation={hasExistingConfirmation}
        />
      )}

      {showScreenshotModal && (
        <ScreenshotModal
          onConfirm={handleAddScreenshot}
          onCancel={() => setShowScreenshotModal(false)}
        />
      )}
    </>
  );
}

function VersionTimelineItem({
  version,
  isCurrent,
  isLatest,
}: {
  version: VersionType;
  isCurrent: boolean;
  isLatest: boolean;
}) {
  return (
    <div className="relative pl-10">
      <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 ${
        isCurrent
          ? 'bg-primary border-primary/20 text-white'
          : 'bg-white border-gray-200 text-gray-400'
      }`}>
        <span className="text-xs font-bold">v{version.versionNumber}</span>
      </div>
      <div className={`p-4 rounded-xl ${
        isCurrent ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50 border border-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isCurrent && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary text-white">
                当前版本
              </span>
            )}
            {isLatest && !isCurrent && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                待复核
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{formatDateTime(version.importedAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
          <Music className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{version.audioFileName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <User className="w-3.5 h-3.5" />
          <span>{version.importedBy}</span>
          <span>·</span>
          <Download className="w-3.5 h-3.5" />
          <span>{version.importSource}</span>
        </div>
        {version.changeDescription && (
          <p className="text-xs text-gray-600 bg-white/60 p-2 rounded-lg">
            {version.changeDescription}
          </p>
        )}
        {version.audioRemark && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">原始备注：</p>
            <p className="text-xs text-gray-600">{version.audioRemark}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: CommentType_ }) {
  return (
    <div className={`p-4 rounded-xl ${
      comment.type === 'override'
        ? 'bg-purple-50 border border-purple-200'
        : 'bg-gray-50 border border-gray-100'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {comment.type === 'override' && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              覆盖旧判断
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3.5 h-3.5" />
            <span className="font-medium text-gray-700">{comment.author}</span>
          </div>
        </div>
        <span className="text-xs text-gray-400">{formatDateTime(comment.createdAt)}</span>
      </div>
      <p className={`text-sm ${
        comment.type === 'override' ? 'text-purple-800 italic' : 'text-gray-700'
      }`}>
        {comment.content}
      </p>
    </div>
  );
}

function ScreenshotItem({ screenshot }: { screenshot: ScreenshotType }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <img
        src={screenshot.dataUrl}
        alt={screenshot.description || '截图'}
        className="w-full h-48 object-cover"
      />
      <div className="p-3 bg-gray-50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">{formatDateTime(screenshot.uploadedAt)}</span>
        </div>
        {screenshot.description && (
          <p className="text-sm text-gray-700">{screenshot.description}</p>
        )}
      </div>
    </div>
  );
}
