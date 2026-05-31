import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/store';
import { formatDateTime } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { playlists, validatePlaylist, validationRules, currentUser } = useStore();

  const playlist = playlists.find((p) => p.id === id);

  const result = useMemo(() => {
    if (!id) return null;
    return validatePlaylist(id);
  }, [id, validatePlaylist]);

  const decadeStats = useMemo(() => {
    if (!playlist) return [];
    const songs = playlist.songs;
    const total = songs.length || 1;
    const decadeMap: Record<string, number> = {};
    songs.forEach((s) => {
      const decade = `${Math.floor(s.year / 10) * 10}s`;
      decadeMap[decade] = (decadeMap[decade] || 0) + 1;
    });
    return Object.entries(decadeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([decade, count]) => ({
        decade,
        count,
        ratio: count / total,
        status: ((): 'ok' | 'warning' | 'error' => {
          const decadeRule = validationRules.find((r) => r.type === 'decade_range' && r.enabled);
          if (!decadeRule) return 'ok';
          const ranges = (decadeRule.params as { ranges: { min: number; max: number; minRatio: number; maxRatio: number }[] }).ranges;
          const decadeStart = parseInt(decade);
          const range = ranges.find((r) => r.min === decadeStart);
          if (!range) return 'ok';
          const ratio = count / total;
          if (ratio > range.maxRatio) return 'error';
          if (ratio < range.minRatio) return 'warning';
          return 'ok';
        })(),
      }));
  }, [playlist, validationRules]);

  const artistOverCount = useMemo(() => {
    if (!playlist) return [];
    const artistRule = validationRules.find((r) => r.type === 'artist_max_count' && r.enabled);
    const maxCount = artistRule ? (artistRule.params as { maxCount: number }).maxCount : 2;
    const artistMap: Record<string, number> = {};
    playlist.songs.forEach((s) => {
      artistMap[s.artist] = (artistMap[s.artist] || 0) + 1;
    });
    return Object.entries(artistMap)
      .filter(([, count]) => count > maxCount)
      .map(([artist, count]) => ({ artist, count, maxCount }));
  }, [playlist, validationRules]);

  const handleExportJSON = () => {
    if (!result || !playlist) return;
    const data = {
      playlistName: playlist.name,
      generatedAt: new Date().toISOString(),
      operator: currentUser,
      score: result.score,
      details: result.details,
      issues: result.issues,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlist.name}-平衡报告.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!playlist) return;
    const headers = ['歌曲名', '歌手', '年代', '流派', '语言', '地区', '标签'];
    const rows = playlist.songs.map((s) => [
      s.title,
      s.artist,
      String(s.year),
      s.genre,
      s.language,
      s.region,
      s.tags.join('/'),
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlist.name}-歌曲列表.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const scoreColor = result
    ? result.score >= 80
      ? 'text-forest'
      : result.score >= 60
        ? 'text-amber'
        : 'text-alert'
    : 'text-muted';

  const dimensions = result
    ? [
        { label: '歌手均衡', value: result.details.artistScore, color: 'bg-navy' },
        { label: '年代分布', value: result.details.decadeScore, color: 'bg-forest' },
        { label: '标签配比', value: result.details.tagScore, color: 'bg-amber' },
        { label: '流派均衡', value: result.details.genreScore, color: 'bg-charcoal' },
      ]
    : [];

  const errorIssues = result ? result.issues.filter((i) => i.severity === 'error') : [];
  const warningIssues = result ? result.issues.filter((i) => i.severity === 'warning') : [];

  return (
    <PageContainer title="平衡报告">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-navy mb-1">
              {playlist.name} - 平衡校验报告
            </h2>
            <p className="text-sm text-muted">
              生成时间：{formatDateTime(new Date().toISOString())} · 操作人：{currentUser}
            </p>
          </div>

          <div className="mb-8">
            <div className="text-center mb-6">
              <span className={cn('text-6xl font-serif font-bold', scoreColor)}>
                {result?.score ?? '-'}
              </span>
              <span className="text-lg text-muted ml-1">/ 100</span>
            </div>
            <div className="space-y-3">
              {dimensions.map((dim) => (
                <div key={dim.label} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-charcoal text-right">{dim.label}</span>
                  <div className="flex-1 h-4 bg-pale rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', dim.color)}
                      style={{ width: `${Math.max(dim.value, 0)}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm font-mono text-charcoal">{dim.value}</span>
                </div>
              ))}
            </div>
          </div>

          {(errorIssues.length > 0 || warningIssues.length > 0) && (
            <div className="mb-8">
              <h3 className="text-base font-semibold text-charcoal mb-3">问题清单</h3>
              <div className="space-y-2">
                {errorIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-2 p-3 bg-alert/5 border border-alert/20 rounded-lg"
                  >
                    <AlertCircle size={16} className="text-alert flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.5 text-xs rounded bg-alert text-white font-medium">
                          错误
                        </span>
                        <span className="text-sm text-charcoal">{issue.message}</span>
                      </div>
                      {issue.sourceFiles.length > 0 && (
                        <p className="text-xs text-muted mt-0.5">
                          关联材料：{issue.sourceFiles.join('、')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {warningIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-2 p-3 bg-amber/5 border border-amber/20 rounded-lg"
                  >
                    <AlertTriangle size={16} className="text-amber flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.5 text-xs rounded bg-amber text-white font-medium">
                          警告
                        </span>
                        <span className="text-sm text-charcoal">{issue.message}</span>
                      </div>
                      {issue.sourceFiles.length > 0 && (
                        <p className="text-xs text-muted mt-0.5">
                          关联材料：{issue.sourceFiles.join('、')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decadeStats.length > 0 && (
            <div className="mb-8">
              <h3 className="text-base font-semibold text-charcoal mb-3">年代分布概览</h3>
              <div className="overflow-hidden rounded-lg border border-pale">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-pale text-charcoal">
                      <th className="px-3 py-2 text-left">年代区间</th>
                      <th className="px-3 py-2 text-right">歌曲数</th>
                      <th className="px-3 py-2 text-right">占比</th>
                      <th className="px-3 py-2 text-center">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decadeStats.map((d) => (
                      <tr key={d.decade} className="border-t border-pale">
                        <td className="px-3 py-2">{d.decade}</td>
                        <td className="px-3 py-2 text-right font-mono">{d.count}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {(d.ratio * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 text-xs rounded-full',
                              d.status === 'ok' && 'bg-forest/10 text-forest',
                              d.status === 'warning' && 'bg-amber/10 text-amber',
                              d.status === 'error' && 'bg-alert/10 text-alert'
                            )}
                          >
                            {d.status === 'ok' ? '正常' : d.status === 'warning' ? '偏低' : '超标'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {artistOverCount.length > 0 && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-charcoal mb-3">超标歌手</h3>
              <div className="space-y-2">
                {artistOverCount.map((a) => (
                  <div
                    key={a.artist}
                    className="flex items-center justify-between p-3 bg-alert/5 border border-alert/20 rounded-lg"
                  >
                    <span className="text-sm text-charcoal font-medium">{a.artist}</span>
                    <span className="text-xs text-alert">
                      {a.count} 首 / 上限 {a.maxCount} 首
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
          >
            <FileJson size={16} />
            导出 JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-forest text-white rounded-lg hover:bg-forest/90 transition-colors"
          >
            <FileSpreadsheet size={16} />
            导出 CSV
          </button>
        </div>

        <Link
          to={`/playlist/${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-charcoal text-white rounded-lg hover:bg-charcoal/90 transition-colors"
        >
          <ArrowLeft size={16} />
          返回歌单
        </Link>
      </div>
    </PageContainer>
  );
}
