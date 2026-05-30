import { useState } from 'react';
import { AlertTriangle, CheckCircle, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_LABELS as issueLabels } from '../../types';
import { ISSUE_COLORS } from '../../utils/colorScheme';

export function IssuePanel() {
  const issues = useAppStore(state => state.issues);
  const resolveIssue = useAppStore(state => state.resolveIssue);
  const selectSegment = useAppStore(state => state.selectSegment);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingIssues = issues.filter(i => i.status === 'pending');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');

  const handleSegmentClick = (segmentId: string) => {
    selectSegment(segmentId);
  };

  const IssueCard = ({ issue }: { issue: typeof issues[0] }) => {
    const isExpanded = expandedId === issue.id;
    const typeLabel = ISSUE_TYPE_LABELS[issue.type];
    
    return (
      <div
        key={issue.id}
        className="bg-[#2A2A3A] rounded-lg border overflow-hidden transition-all"
        style={{ borderColor: `${ISSUE_COLORS[issue.type]}40` }}
      >
        <div
          className="p-3 cursor-pointer hover:bg-[#3A3A4A] transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : issue.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded flex items-center justify-center"
                style={{ backgroundColor: `${ISSUE_COLORS[issue.type]}20` }}
              >
                <AlertTriangle size={16} style={{ color: ISSUE_COLORS[issue.type] }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[#F5F0E6] text-sm font-medium">
                    {typeLabel}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: `${ISSUE_COLORS[issue.type]}20`,
                      color: ISSUE_COLORS[issue.type]
                    }}
                  >
                    {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <div className="text-[#A0A0A0] text-xs mt-0.5 line-clamp-1">
                  {issue.description}
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp size={16} className="text-[#A0A0A0]" />
            ) : (
              <ChevronDown size={16} className="text-[#A0A0A0]" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-[#3A3A4A] pt-3">
            <p className="text-[#F5F0E6] text-sm">{issue.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <User size={12} className="text-[#A0A0A0]" />
                <span className="text-[#A0A0A0]">处理人：</span>
                <span className="text-[#F5F0E6]">{issue.assignee}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Calendar size={12} className="text-[#A0A0A0]" />
                <span className="text-[#A0A0A0]">创建时间：</span>
                <span className="text-[#F5F0E6]">
                  {new Date(issue.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1">
              <span className="text-[#A0A0A0] text-xs">关联片段：</span>
              {issue.relatedSegmentIds.map(segId => (
                <button
                  key={segId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSegmentClick(segId);
                  }}
                  className="px-2 py-0.5 bg-[#3A3A4A] hover:bg-[#8B2323] text-xs rounded text-[#F5F0E6] transition-colors"
                >
                  {segId}
                </button>
              ))}
            </div>
            
            {issue.type === 'misalignment' && (
              <div className="p-2 bg-[#E74C3C]/10 border border-[#E74C3C]/30 rounded text-xs text-[#E74C3C]">
                ⚠️ 指法错位已进入待确认分支，请联系指法标注组核对原始记录
              </div>
            )}
            
            {issue.type === 'overlap' && (
              <div className="p-2 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded text-xs text-[#F39C12]">
                🔍 片段重叠，请联系录音整理人员核对原始录音文件
              </div>
            )}
            
            {issue.type === 'missing_band' && (
              <div className="p-2 bg-[#E67E22]/10 border border-[#E67E22]/30 rounded text-xs text-[#E67E22]">
                🎛️ 频段缺失，请联系音频技术人员检查录音设备
              </div>
            )}
            
            {issue.status === 'pending' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resolveIssue(issue.id);
                }}
                className="w-full py-2 bg-[#27AE60] hover:bg-[#2ECC71] text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                标记为已解决
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#1E1E2A] rounded-lg p-4 border border-[#3A3A4A]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[#F5F0E6] font-medium text-sm">问题中心</h3>
        {pendingIssues.length > 0 && (
          <span className="px-2 py-0.5 bg-[#E74C3C]/20 text-[#E74C3C] text-xs rounded-full">
            {pendingIssues.length} 待处理
          </span>
        )}
      </div>
      
      {pendingIssues.length === 0 && resolvedIssues.length === 0 ? (
        <p className="text-[#A0A0A0] text-sm text-center py-6">
          暂无数据质量问题
        </p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {pendingIssues.map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
          
          {resolvedIssues.length > 0 && (
            <>
              <div className="pt-2 mt-2 border-t border-[#3A3A4A]">
                <p className="text-[#A0A0A0] text-xs mb-2">
                  已解决 ({resolvedIssues.length})
                </p>
              </div>
              {resolvedIssues.map(issue => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
