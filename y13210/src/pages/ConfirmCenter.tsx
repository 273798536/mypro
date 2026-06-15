import { Fragment, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Merge,
  GitBranch,
  Check,
  X,
  HelpCircle,
  FileWarning,
  ArrowRight,
  Play,
  Users,
  Folder,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReviewStore } from '../store/reviewStore';
import { REASON_LABELS, VOICE_LABELS, VOICE_COLORS, VoiceType } from '../types';

export default function ConfirmCenter() {
  const navigate = useNavigate();
  const batches = useReviewStore((s) => s.batches);
  const activeBatchId = useReviewStore((s) => s.activeBatchId);
  const resolveAliasConflict = useReviewStore((s) => s.resolveAliasConflict);
  const [hoveredConflict, setHoveredConflict] = useState<string | null>(null);

  const batch = batches.find((b) => b.id === activeBatchId);
  const conflicts = batch?.aliasConflicts ?? [];
  const unconfirmedCount = conflicts.filter((c) => !c.confirmed).length;

  const affectedFilesMap = useMemo(() => {
    const result: Record<string, Array<{ fileId: string; song: string; file: string; vt: VoiceType }>> = {};
    if (!batch) return result;
    conflicts.forEach((c) => {
      result[c.id] = [];
      c.affectedFileIds.forEach((fid) => {
        for (const s of batch.songs) {
          const f = s.audioFiles.find((af) => af.id === fid);
          if (f) {
            const vt = (['soprano', 'alto', 'tenor', 'bass'] as VoiceType[])[
              s.audioFiles.indexOf(f) % 4
            ];
            result[c.id].push({ fileId: fid, song: s.name, file: f.fileName, vt });
            break;
          }
        }
      });
    });
    return result;
  }, [conflicts, batch]);

  if (!batch) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-ink-500">请先选择一个复核批次</p>
      </div>
    );
  }

  const proceedEnabled = unconfirmedCount === 0;

  return (
    <div className="space-y-6">
      {/* 顶部告警横幅 */}
      <div
        className={`rounded-2xl border-2 p-6 transition-all ${
          unconfirmedCount > 0
            ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-copper-50 shadow-card'
            : 'border-forest-300 bg-gradient-to-br from-forest-50 to-emerald-50 shadow-card'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl ${
              unconfirmedCount > 0 ? 'bg-yellow-400/20' : 'bg-forest-400/20'
            }`}
          >
            {unconfirmedCount > 0 ? (
              <AlertTriangle size={28} className="text-yellow-700" />
            ) : (
              <Check size={28} className="text-forest-700" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-2xl font-bold text-ink-900 mb-1">
              {unconfirmedCount > 0
                ? `系统检测到 ${unconfirmedCount} 组曲名别名重复，已暂停计算`
                : '所有曲名别名已经确认，可继续计算'}
            </h2>
            <p className="text-sm text-ink-600 leading-relaxed">
              {unconfirmedCount > 0 ? (
                <>
                  为什么不直接算完？因为系统分不清是
                  <span className="font-medium text-copper-700">「同一首歌的不同写法」</span>还是
                  <span className="font-medium text-forest-700">「两首不同的歌恰好同名」</span>。
                  请逐一确认影响范围和原因，<span className="underline decoration-dotted">确认后才会继续完整的声部复核计算</span>。
                </>
              ) : (
                <>
                  所有歧义项都已处理完毕。点击下方「开始计算」按钮，系统将对 {batch.songs.length} 首曲目、
                  {batch.songs.length * 4} 个声部进行能量 / 音准 / 进拍综合对比。
                </>
              )}
            </p>
            {unconfirmedCount > 0 && (
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="tag bg-yellow-100 text-yellow-800 border-yellow-300">
                  <HelpCircle size={12} /> 不会操作？
                </span>
                <span className="text-ink-600">
                  看右侧"可能原因"，然后按场景选择「合并为同一首」或「标记为不同曲目」
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/review')}
            disabled={!proceedEnabled}
            className={`shrink-0 px-6 py-3 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2 ${
              proceedEnabled
                ? 'bg-forest-500 text-white hover:bg-forest-700 hover:shadow-md hover:-translate-y-0.5'
                : 'bg-ink-100 text-ink-400 cursor-not-allowed'
            }`}
          >
            {proceedEnabled ? (
              <>
                <Play size={16} /> 继续计算 →
              </>
            ) : (
              <>
                <X size={16} /> 还有 {unconfirmedCount} 组待确认
              </>
            )}
          </button>
        </div>
      </div>

      {/* 冲突列表 */}
      <div className="space-y-5">
        {conflicts.length === 0 ? (
          <div className="page-card text-center py-16">
            <div className="text-5xl mb-3">🎶</div>
            <h3 className="font-serif text-xl font-bold text-ink-800 mb-1">
              本批次未检测到曲名别名重复
            </h3>
            <p className="text-sm text-ink-500">
              所有曲目命名清晰一致，可以放心进入声部复核环节
            </p>
            <button onClick={() => navigate('/review')} className="btn-primary mt-6">
              <ArrowRight size={16} /> 前往声部复核
            </button>
          </div>
        ) : (
          conflicts.map((c, idx) => (
            <div
              key={c.id}
              className={`page-card transition-all ${
                c.confirmed
                  ? 'opacity-70 ring-1 ring-forest-200'
                  : hoveredConflict === c.id
                  ? 'shadow-cardHover ring-2 ring-copper-300'
                  : ''
              }`}
              onMouseEnter={() => setHoveredConflict(c.id)}
              onMouseLeave={() => setHoveredConflict(null)}
            >
              <div className="flex items-start gap-5">
                {/* 编号 */}
                <div
                  className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-serif font-bold text-lg ${
                    c.confirmed
                      ? 'bg-forest-100 text-forest-700'
                      : 'bg-copper-100 text-copper-700'
                  }`}
                >
                  {c.confirmed ? <Check size={20} /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0 space-y-4">
                  {/* 重复项展示 */}
                  <div>
                    <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2">
                      检测到的重复曲名 · {c.duplicateNames.length} 项
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {c.duplicateNames.map((n, i) => (
                        <Fragment key={n}>
                          <div
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-copper-100 to-yellow-50 border border-copper-200 text-ink-900 font-serif font-medium"
                          >
                            《{n}》
                          </div>
                          {i < c.duplicateNames.length - 1 && (
                            <span className="text-copper-500 text-sm font-bold">≈</span>
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </div>

                  {/* 可能原因 */}
                  <div>
                    <p className="text-[11px] text-ink-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <HelpCircle size={12} /> 可能原因（供参考，请人工判断）
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.possibleReasons.map((r) => (
                        <span
                          key={r}
                          className="tag bg-ink-50 text-ink-700 border-ink-200 !py-1 !px-3 !text-xs"
                        >
                          {REASON_LABELS[r]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 影响范围预览 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-ink-500 uppercase tracking-wider flex items-center gap-1">
                        <FileWarning size={12} /> 影响范围预览
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-ink-500">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {c.affectedVoiceCount} 个声部
                        </span>
                        <span className="flex items-center gap-1">
                          <Folder size={12} />
                          {c.affectedFileIds.length} 个文件
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-ink-50/80 border border-ink-100 p-3 space-y-1.5 max-h-44 overflow-y-auto">
                      {c.affectedSongNames.map((sn, si) => (
                        <div
                          key={si}
                          className={`rounded-lg p-2 flex items-center gap-2 ${
                            hoveredConflict === c.id
                              ? 'bg-copper-100/40 ring-1 ring-copper-200'
                              : 'bg-white/70'
                          } transition-all`}
                        >
                          <span className="text-sm">🎵</span>
                          <span className="text-xs font-medium text-ink-800 shrink-0 w-28 truncate">
                            {sn}
                          </span>
                          <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                            {(['soprano', 'alto', 'tenor', 'bass'] as VoiceType[]).map(
                              (vt, vi) => (
                                <span
                                  key={vt}
                                  className={`px-2 py-0.5 rounded-md text-white text-[10px] ${
                                    si % 3 !== vi % 3 ? 'opacity-90' : 'opacity-30'
                                  }`}
                                  style={{ backgroundColor: VOICE_COLORS[vt] }}
                                >
                                  {VOICE_LABELS[vt]}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                      {affectedFilesMap[c.id]?.slice(0, 3).map((af) => (
                        <div
                          key={af.fileId}
                          className="text-[11px] text-ink-500 pl-6 py-1 truncate font-mono"
                        >
                          📄 {af.file}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 操作按钮区 */}
                  {!c.confirmed ? (
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-xs text-ink-500 mr-auto">
                        请根据情况选择：
                      </p>
                      <button
                        onClick={() => resolveAliasConflict(c.id, 'separate')}
                        className="btn-secondary !py-2.5 !px-5 !text-sm"
                      >
                        <GitBranch size={16} />
                        是两首不同的，区分开
                      </button>
                      <button
                        onClick={() => resolveAliasConflict(c.id, 'merge')}
                        className="btn-copper !py-2.5 !px-5 !text-sm"
                      >
                        <Merge size={16} />
                        是同一首，合并计算
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="tag bg-forest-100 text-forest-800 border-forest-200 !py-1 !px-3">
                        ✓ 已确认：{c.resolution === 'merge' ? '合并为同一首' : '区分为两首'}
                      </span>
                      <span className="text-[11px] text-ink-500 ml-auto">
                        如需修改请刷新页面后重新确认
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部确认提示 */}
      {unconfirmedCount === 0 && conflicts.length > 0 && (
        <div className="page-card !bg-gradient-to-r !from-forest-50/80 !to-emerald-50/80 !border-forest-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest-500 flex items-center justify-center text-white text-2xl shadow-md shrink-0">
              🎉
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-lg font-bold text-ink-900 mb-0.5">
                所有别名冲突已处理完毕
              </h3>
              <p className="text-sm text-ink-600">
                现在可以进入声部复核详情页，系统将对全部 {batch.songs.length * 4} 个声部完成对比计算
              </p>
            </div>
            <button onClick={() => navigate('/review')} className="btn-primary !py-3 !px-6">
              <ArrowRight size={16} /> 前往复核详情
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
