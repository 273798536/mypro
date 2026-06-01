import { Sample, Track, License } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { ArrowLeft, Music, Clock, FileType, Hash, User, Calendar, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SampleDetailProps {
  sample: Sample;
  relatedTracks: Track[];
  relatedLicenses: License[];
}

export const SampleDetail = ({ sample, relatedTracks, relatedLicenses }: SampleDetailProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/samples')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h2 className="text-2xl font-bold text-white">{sample.name}</h2>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">素材信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-gray-400">素材名称</p>
                  <p className="text-sm text-white">{sample.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-gray-400">来源</p>
                  <p className="text-sm text-white">{sample.source}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileType className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-gray-400">格式</p>
                  <p className="text-sm text-white">{sample.format}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-gray-400">时长</p>
                  <p className="text-sm text-white">{sample.duration} 秒</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-gray-400">创建人</p>
                  <p className="text-sm text-white">{sample.createdBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-gray-400">创建日期</p>
                  <p className="text-sm text-white">{formatDate(sample.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {sample.isDuplicate && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">重名警告</p>
                  <p className="text-xs text-gray-400 mt-1">
                    该素材名称与其他素材冲突，请确认是否为同一素材。冲突的素材 ID：
                    {sample.duplicateWith?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">文件哈希</h3>
            <code className="text-sm text-gray-300 bg-primary/50 px-4 py-2 rounded-lg block font-mono">
              {sample.hash}
            </code>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">关联曲目</h3>
            {relatedTracks.length === 0 ? (
              <p className="text-sm text-gray-400">暂无关联曲目</p>
            ) : (
              <div className="space-y-3">
                {relatedTracks.map((track) => (
                  <div
                    key={track.id}
                    className="p-3 rounded-lg bg-primary/50 hover:bg-primary/70 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tracks/${track.id}`)}
                  >
                    <p className="text-sm font-medium text-white">{track.name}</p>
                    <p className="text-xs text-gray-400">{track.artist}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">关联授权</h3>
            {relatedLicenses.length === 0 ? (
              <p className="text-sm text-gray-400">暂无关联授权</p>
            ) : (
              <div className="space-y-3">
                {relatedLicenses.map((license) => (
                  <div
                    key={license.id}
                    className="p-3 rounded-lg bg-primary/50 hover:bg-primary/70 cursor-pointer transition-colors"
                    onClick={() => navigate(`/licenses/${license.id}`)}
                  >
                    <p className="text-sm font-medium text-white">{license.name}</p>
                    <p className="text-xs text-gray-400">{license.type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
