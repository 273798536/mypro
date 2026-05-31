import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Globe,
  Clock,
  User,
  Music,
  Shield,
  FileText,
  Tag,
} from 'lucide-react';
import { matchesApi } from '../utils/api';
import Loading from '../components/Loading';
import RiskBadge from '../components/RiskBadge';
import Toast from '../components/Toast';
import {
  MATCH_STATUS_LABELS,
  LICENSE_TYPE_LABELS,
  CONFLICT_TYPE_LABELS,
} from '../../shared/types';
import type { MatchResult, Song, Copyright, RiskLevel } from '../../shared/types';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<(MatchResult & { song: Song; copyright: Copyright | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (!id) return;
    loadMatchDetail();
  }, [id]);

  const loadMatchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await matchesApi.getById(id);
      setMatch(data as (MatchResult & { song: Song; copyright: Copyright | null }) | null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12">
        <Loading text="加载中..." />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="p-6">
        <Toast message={error || '加载失败'} type="error" onClose={() => navigate('/matches')} />
      </div>
    );
  }

  const copyright = match.copyright;

  return (
    <div className="p-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <button
        onClick={() => navigate('/matches')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        返回匹配列表
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{match.song.name}</h1>
              <RiskBadge level={match.riskLevel as RiskLevel} pulse />
            </div>
            <p className="text-slate-500">
              歌手：{match.song.artist} · 时长：{formatDuration(match.song.duration)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
              {match.matchStatus === 'full' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : match.matchStatus === 'conflict' ? (
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
              <span className="font-medium text-slate-700">
                {MATCH_STATUS_LABELS[match.matchStatus]}
              </span>
            </div>
            <div className="px-4 py-2 bg-blue-50 rounded-lg">
              <span className="text-blue-700 font-medium">
                匹配度：{(match.matchConfidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {match.riskReasons && match.riskReasons.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              风险提示
            </h3>
            <ul className="space-y-1">
              {match.riskReasons.map((reason, index) => (
                <li key={index} className="text-amber-700 text-sm flex items-start gap-2">
                  <span className="mt-1">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-blue-600" />
              点歌单信息
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">歌曲名称</p>
                  <p className="font-medium text-slate-900">{match.song.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">歌手</p>
                  <p className="font-medium text-slate-900">{match.song.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">时长</p>
                  <p className="font-medium text-slate-900">{formatDuration(match.song.duration)}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              版权授权信息
            </h3>
            {copyright ? (
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">授权歌曲</p>
                    <p className="font-medium text-slate-900">{copyright.songName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">版权歌手</p>
                    <p className="font-medium text-slate-900">{copyright.artist}</p>
                    {copyright.isCover && copyright.originalArtist && (
                      <p className="text-xs text-purple-600">
                        翻唱 · 原唱：{copyright.originalArtist}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">授权类型</p>
                    <p className="font-medium text-slate-900">
                      {LICENSE_TYPE_LABELS[copyright.licenseType]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">授权地区</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {copyright.authorizedRegions.map((region) => (
                        <span
                          key={region}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">有效期</p>
                    <p className={cn(
                      'font-medium',
                      new Date(copyright.validTo) < new Date() ? 'text-red-600' : 'text-slate-900'
                    )}>
                      {copyright.validFrom} 至 {copyright.validTo}
                      {new Date(copyright.validTo) < new Date() && '（已过期）'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">未找到匹配的版权授权记录</p>
              </div>
            )}
          </div>
        </div>

        {match.regionRestrictions && match.regionRestrictions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-600" />
              地区限制提示
            </h3>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-700 mb-2">
                以下地区未获得授权，直播时需注意：
              </p>
              <div className="flex flex-wrap gap-2">
                {match.regionRestrictions.slice(0, 10).map((region) => (
                  <span
                    key={region}
                    className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full"
                  >
                    {region}
                  </span>
                ))}
                {match.regionRestrictions.length > 10 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                    +{match.regionRestrictions.length - 10} 更多
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {match.matchStatus === 'conflict' && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              冲突详情
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">点歌单数据</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-red-600">歌曲：</span>
                    {match.song.name}
                  </p>
                  <p>
                    <span className="text-red-600">歌手：</span>
                    {match.song.artist}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">曲库授权数据</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-blue-600">歌曲：</span>
                    {copyright?.songName || '-'}
                  </p>
                  <p>
                    <span className="text-blue-600">歌手：</span>
                    {copyright?.artist || '-'}
                  </p>
                  {copyright?.isCover && (
                    <p>
                      <span className="text-blue-600">原唱：</span>
                      {copyright.originalArtist}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <span className="font-medium">冲突类型：</span>
                {CONFLICT_TYPE_LABELS['artist_mismatch']}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                请前往「冲突处理」页面进行人工处理，或在「风险分级与复核」中调整风险等级。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
