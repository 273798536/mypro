import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-forest text-white';
  if (score >= 60) return 'bg-amber text-white';
  return 'bg-alert text-white';
}

function getBarColor(score: number) {
  if (score >= 80) return 'bg-forest';
  if (score >= 60) return 'bg-amber';
  return 'bg-alert';
}

export default function ValidatePage() {
  const { id } = useParams<{ id: string }>();
  const { playlists, validatePlaylist, validationRules } = useStore();

  const playlist = playlists.find((p) => p.id === id);

  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const result = useMemo(() => {
    if (!id) return null;
    return validatePlaylist(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, playlist?.songs, validationRules]);

  useEffect(() => {
    if (id) validatePlaylist(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const artistRule = validationRules.find((r) => r.type === 'artist_max_count');
  const decadeRule = validationRules.find((r) => r.type === 'decade_range');

  const maxCount = (artistRule?.params as { maxCount: number } | undefined)?.maxCount ?? 2;

  const decadeRanges = useMemo(() => {
    if (!decadeRule) return [];
    const params = decadeRule.params as {
      ranges: { min: number; max: number; minRatio: number; maxRatio: number }[];
    };
    return params.ranges;
  }, [decadeRule]);

  const decadeChartData = useMemo(() => {
    if (!playlist) return [];
    const total = playlist.songs.length || 1;
    return decadeRanges.map((range) => {
      const count = playlist.songs.filter(
        (s) => s.year >= range.min && s.year <= range.max
      ).length;
      const ratio = count / total;
      const imbalanced = ratio < range.minRatio || ratio > range.maxRatio;
      return {
        label: `${Math.floor(range.min / 100)}s`,
        count,
        ratio: `${(ratio * 100).toFixed(1)}%`,
        imbalanced,
      };
    });
  }, [playlist, decadeRanges]);

  const artistStats = useMemo(() => {
    if (!playlist) return [];
    const map: Record<string, { count: number; songs: typeof playlist.songs }> = {};
    playlist.songs.forEach((s) => {
      if (!map[s.artist]) map[s.artist] = { count: 0, songs: [] };
      map[s.artist].count++;
      map[s.artist].songs.push(s);
    });
    return Object.entries(map)
      .map(([artist, data]) => ({
        artist,
        count: data.count,
        songs: data.songs,
        overThreshold: data.count > maxCount,
      }))
      .sort((a, b) => b.count - a.count);
  }, [playlist, maxCount]);

  const toggleIssue = (issueId: string) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  if (!playlist) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96 text-muted text-lg">
          歌单不存在
        </div>
      </PageContainer>
    );
  }

  if (!result) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96 text-muted text-lg">
          正在校验...
        </div>
      </PageContainer>
    );
  }

  const errorIssues = result.issues.filter((i) => i.severity === 'error');
  const warningIssues = result.issues.filter((i) => i.severity === 'warning');

  const subScores = [
    { label: '歌手', score: result.details.artistScore, weight: '30%', key: 'artist' as const },
    { label: '年代', score: result.details.decadeScore, weight: '30%', key: 'decade' as const },
    { label: '标签', score: result.details.tagScore, weight: '20%', key: 'tag' as const },
    { label: '流派', score: result.details.genreScore, weight: '20%', key: 'genre' as const },
  ];

  return (
    <PageContainer>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy">
            平衡校验 - {playlist.name}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (id) validatePlaylist(id);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded hover:bg-navy/90 text-sm"
            >
              <RefreshCw size={14} /> 重新校验
            </button>
            <Link
              to={`/playlist/${id}`}
              className="flex items-center gap-1 px-3 py-1.5 bg-charcoal text-white rounded hover:bg-charcoal/90 text-sm"
            >
              <ArrowLeft size={14} /> 返回编辑
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn('score-ring w-[100px] h-[100px] text-4xl', getScoreColor(result.score))}
              >
                {result.score}
              </div>
              <span className="text-sm text-muted">总评分</span>
            </div>

            <div className="flex-1 grid grid-cols-4 gap-4">
              {subScores.map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-charcoal font-medium">{item.label}</span>
                    <span className={cn(
                      'font-mono font-semibold',
                      item.score >= 80 ? 'text-forest' : item.score >= 60 ? 'text-amber' : 'text-alert'
                    )}>
                      {item.score}
                    </span>
                  </div>
                  <div className="h-2 bg-pale rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', getBarColor(item.score))}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted">权重 {item.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-pale">
            <h2 className="text-lg font-semibold text-charcoal">
              问题列表
              <span className="ml-2 text-sm font-normal text-muted">
                ({errorIssues.length} 错误 / {warningIssues.length} 警告)
              </span>
            </h2>
          </div>

          <div className="divide-y divide-pale">
            {result.issues.length === 0 && (
              <div className="px-6 py-8 text-center text-muted">
                所有校验通过，未发现问题
              </div>
            )}

            {errorIssues.length > 0 && (
              <>
                {errorIssues.length > 0 && warningIssues.length > 0 && (
                  <div className="px-6 py-2 bg-alert/5 text-alert text-xs font-semibold tracking-wide">
                    错误 ({errorIssues.length})
                  </div>
                )}
                {errorIssues.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    expanded={expandedIssues.has(issue.id)}
                    onToggle={() => toggleIssue(issue.id)}
                    songs={playlist.songs}
                  />
                ))}
              </>
            )}

            {warningIssues.length > 0 && (
              <>
                <div className="px-6 py-2 bg-amber/5 text-amber text-xs font-semibold tracking-wide">
                  警告 ({warningIssues.length})
                </div>
                {warningIssues.map((issue) => (
                  <IssueItem
                    key={issue.id}
                    issue={issue}
                    expanded={expandedIssues.has(issue.id)}
                    onToggle={() => toggleIssue(issue.id)}
                    songs={playlist.songs}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-charcoal mb-4">年代分布</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={decadeChartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6D6875' }} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#6D6875' }}
                />
                <Tooltip
                  formatter={(value: number) => [value, '歌曲数']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {decadeChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.imbalanced ? '#E63946' : '#2A9D8F'}
                    />
                  ))}
                  <LabelList dataKey="ratio" position="top" style={{ fontSize: 11, fill: '#6D6875' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-charcoal mb-4">歌手统计</h2>
            <div className="overflow-y-auto max-h-[280px] scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-pale text-charcoal">
                    <th className="px-3 py-2 text-left">歌手名</th>
                    <th className="px-3 py-2 text-center">歌曲数</th>
                    <th className="px-3 py-2 text-center">阈值</th>
                    <th className="px-3 py-2 text-center">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {artistStats.map((stat) => (
                    <tr
                      key={stat.artist}
                      className={cn(
                        'border-t border-pale',
                        stat.overThreshold ? 'issue-row-critical' : 'bg-white'
                      )}
                    >
                      <td className="px-3 py-2">{stat.artist}</td>
                      <td className="px-3 py-2 text-center font-mono">{stat.count}</td>
                      <td className="px-3 py-2 text-center font-mono">{maxCount}</td>
                      <td className="px-3 py-2 text-center">
                        {stat.overThreshold ? (
                          <span className="flex items-center justify-center gap-1">
                            <AlertTriangle size={12} /> 超标
                          </span>
                        ) : (
                          <span className="text-forest">正常</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function IssueItem({
  issue,
  expanded,
  onToggle,
  songs,
}: {
  issue: import('@/types').ValidationIssue;
  expanded: boolean;
  onToggle: () => void;
  songs: import('@/types').Song[];
}) {
  const isError = issue.severity === 'error';
  const relatedSongs = songs.filter((s) => issue.songIds.includes(s.id));

  return (
    <div
      className={cn(
        'border-l-4 cursor-pointer transition-colors',
        isError ? 'bg-alert/10 border-alert' : 'bg-amber/10 border-amber'
      )}
    >
      <div className="px-6 py-3" onClick={onToggle}>
        <div className="flex items-start gap-2">
          {isError ? (
            <AlertTriangle size={16} className="text-alert mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-amber mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-charcoal font-medium">{issue.message}</div>
            <div className="text-xs text-muted mt-0.5">{issue.suggestion}</div>
            {issue.sourceFiles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {issue.sourceFiles.map((file) => (
                  <span key={file} className="source-badge">{file}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 text-muted">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </div>

      {expanded && relatedSongs.length > 0 && (
        <div className="px-6 pb-3 pl-12">
          <div className="space-y-1">
            {relatedSongs.map((song) => (
              <div key={song.id} className="flex items-center gap-2 text-xs">
                <span className="text-charcoal">
                  {song.title} - {song.artist} - {song.year}
                </span>
                <span className="source-badge">{song.source.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
