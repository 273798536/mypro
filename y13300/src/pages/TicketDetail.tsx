import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Lock, Unlock, FileText, GitCompare, Plus, AlertCircle,
  Loader2, User, Clock, CheckCircle
} from 'lucide-react';
import type { TicketStatus } from '../../shared/types.js';
import { STATUS_LABELS, STATUS_COLORS } from '../../shared/types.js';
import { useTicketStore } from '@/store/useTicketStore.js';
import { cn } from '@/lib/utils.js';
import VersionTimeline from '@/components/VersionTimeline.js';
import EvidenceTable from '@/components/EvidenceTable.js';
import ImportModal from './ImportModal.js';

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentTicket, currentVersion, versions, auditLogs, loading, error,
    fetchTicketDetail, fetchVersions, fetchVersionDetail, fetchAuditLogs,
    lockVersion, unlockVersion, updateStatus, setError
  } = useTicketStore();

  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const isLocked = currentVersion?.isLocked;

  useEffect(() => {
    if (id) {
      fetchTicketDetail(id);
      fetchVersions(id);
      fetchAuditLogs(id);
    }
    return () => setError(null);
  }, [id, fetchTicketDetail, fetchVersions, fetchAuditLogs, setError]);

  useEffect(() => {
    if (currentVersion) setSelectedVersion(currentVersion.version);
  }, [currentVersion]);

  const handleVersionSelect = async (version: number) => {
    if (id) {
      setSelectedVersion(version);
      await fetchVersionDetail(id, version);
    }
  };

  const handleLockToggle = async () => {
    if (!id) return;
    let success: boolean;
    if (isLocked) {
      success = await unlockVersion(id);
    } else if (currentVersion) {
      success = await lockVersion(id, currentVersion.version, '当前用户');
    } else return;
    if (success) {
      fetchTicketDetail(id);
      fetchVersions(id);
    }
  };

  const handleStatusUpdate = async (status: TicketStatus) => {
    if (id) {
      const success = await updateStatus(id, status, '当前用户');
      if (success) {
        fetchTicketDetail(id);
      }
      setShowStatusMenu(false);
    }
  };

  const handleVersionCreated = () => {
    setShowImportModal(false);
    if (id) {
      fetchVersions(id);
      fetchTicketDetail(id);
    }
  };

  if (loading && !currentTicket) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800">
                  工单 {currentTicket?.ticketNo}
                </h1>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium text-white', STATUS_COLORS[currentTicket?.status || 'pending'])}>
                  {STATUS_LABELS[currentTicket?.status || 'pending']}
                </span>
                {currentTicket?.hasSampleLeak && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                    样本泄漏
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">{currentTicket?.customerIssue}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => id && navigate(`/ticket/${id}/compare`)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              版本对比
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              补充证据
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <VersionTimeline
          versions={versions}
          selectedVersion={selectedVersion}
          onSelect={handleVersionSelect}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {currentVersion && (
            <>
              <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-bold text-lg text-slate-800">
                        v{currentVersion.version}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium text-white', STATUS_COLORS[currentVersion.status])}>
                        {STATUS_LABELS[currentVersion.status]}
                      </span>
                      {currentVersion.isLocked && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">
                          <Lock className="w-3 h-3" />
                          已锁定
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed">{currentVersion.summary}</p>
                    <div className="flex items-center gap-6 mt-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {currentVersion.createdBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(currentVersion.createdAt).toLocaleString('zh-CN')}
                      </span>
                      <span>模型版本：{currentVersion.modelVersion}</span>
                    </div>
                    {currentVersion.changeNote && (
                      <p className="mt-2 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded">
                        <span className="font-medium">变更说明：</span>{currentVersion.changeNote}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      证据列表 ({currentVersion.evidences.length} 条)
                    </h3>
                  </div>
                  <EvidenceTable evidences={currentVersion.evidences} />
                </div>

                {auditLogs.length > 0 && (
                  <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                      <h3 className="font-semibold text-slate-800">操作日志</h3>
                    </div>
                    <div className="p-4 max-h-48 overflow-y-auto space-y-3">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-300" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">{log.operator}</span>
                              <span className="text-slate-400">{log.action}</span>
                            </div>
                            <p className="text-slate-500 mt-0.5">{log.detail}</p>
                            <span className="text-xs text-slate-400">
                              {new Date(log.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {currentTicket && (
              <span>当前版本：v{currentTicket.currentVersion} | 最新版本：v{currentTicket.latestVersion}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                更新状态
              </button>
              {showStatusMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-36 z-10">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => handleStatusUpdate(value as TicketStatus)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                    >
                      <span className={cn('w-2 h-2 rounded-full', STATUS_COLORS[value as TicketStatus])} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleLockToggle}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isLocked
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-violet-600 text-white hover:bg-violet-700'
              )}
            >
              {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isLocked ? '解锁版本' : '锁定此版本'}
            </button>
            <button
              onClick={() => handleStatusUpdate('completed')}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              人工复核通过
            </button>
          </div>
        </div>
      </div>

      {showImportModal && id && (
        <ImportModal
          ticketId={id}
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleVersionCreated}
          mode="supplement"
        />
      )}
    </div>
  );
}
