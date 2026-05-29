import { AlertTriangle, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { useTheaterStore } from '@/store/theaterStore';
import { IssueStatus, IssueType } from '@/types';

const issueTypeLabels: Record<IssueType, { label: string; color: string }> = {
  railing_block: { label: '栏杆遮挡', color: 'bg-yellow-900/50 text-yellow-400 border-yellow-700' },
  duplicate_seat: { label: '座位重复', color: 'bg-orange-900/50 text-orange-400 border-orange-700' },
  view_error: { label: '视角错误', color: 'bg-red-900/50 text-red-400 border-red-700' },
  other: { label: '其他问题', color: 'bg-gray-700 text-gray-400 border-gray-600' },
};

const statusLabels: Record<IssueStatus, { label: string; icon: any; color: string }> = {
  pending: { label: '待确认', icon: Clock, color: 'text-yellow-400' },
  confirmed: { label: '已确认', icon: CheckCircle, color: 'text-theater-success' },
  resolved: { label: '已解决', icon: XCircle, color: 'text-gray-500' },
};

export function PendingIssues() {
  const pendingIssues = useTheaterStore((state) => state.pendingIssues);
  const seats = useTheaterStore((state) => state.seats);
  const setSelectedSeat = useTheaterStore((state) => state.setSelectedSeat);
  const updateIssueStatus = useTheaterStore((state) => state.updateIssueStatus);

  const getSeatInfo = (seatId: string) => {
    const seat = seats.find((s) => s.id === seatId);
    return seat ? `${seat.row}${seat.number}` : '未知座位';
  };

  const pendingCount = pendingIssues.filter((i) => i.status === 'pending').length;

  return (
    <div className="bg-theater-dark border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-800">
        <h3 className="text-theater-gold font-display text-lg font-semibold flex items-center gap-2">
          <AlertTriangle size={18} />
          待确认问题
          {pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-theater-red text-white text-xs rounded-full">
              {pendingCount}
            </span>
          )}
        </h3>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {pendingIssues.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            <CheckCircle size={32} className="mx-auto mb-2 opacity-50 text-theater-success" />
            <p>暂无待确认问题</p>
            <p className="text-xs mt-1">系统运行良好</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {pendingIssues.map((issue) => {
              const typeConfig = issueTypeLabels[issue.type];
              const statusConfig = statusLabels[issue.status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={issue.id}
                  className={`p-3 hover:bg-gray-800/50 transition-colors ${
                    issue.status === 'resolved' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 px-2 py-0.5 text-xs rounded border ${typeConfig.color}`}
                    >
                      {typeConfig.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => {
                          const seat = seats.find((s) => s.id === issue.seatId);
                          if (seat) setSelectedSeat(seat);
                        }}
                        className="text-white font-medium text-sm hover:text-theater-gold transition-colors flex items-center gap-1"
                      >
                        {getSeatInfo(issue.seatId)}
                        <ChevronRight size={14} className="opacity-50" />
                      </button>
                      <p className="text-gray-400 text-xs mt-1">{issue.description}</p>
                      <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                        <span className="text-theater-gold">建议：</span>
                        {issue.suggestedAction}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {issue.status === 'pending' && (
                    <div className="flex gap-2 mt-3 pl-0">
                      <button
                        onClick={() => updateIssueStatus(issue.id, 'confirmed')}
                        className="flex-1 py-1.5 bg-theater-success/20 hover:bg-theater-success/30 text-theater-success text-xs rounded transition-colors"
                      >
                        确认问题
                      </button>
                      <button
                        onClick={() => updateIssueStatus(issue.id, 'resolved')}
                        className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                      >
                        标记解决
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
