import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { SampleList } from '@/components/samples/SampleList';
import { SampleDetail } from '@/components/samples/SampleDetail';
import { SampleForm } from '@/components/samples/SampleForm';
import { useSampleStore } from '@/store/useSampleStore';
import { useTrackStore } from '@/store/useTrackStore';
import { useLicenseStore } from '@/store/useLicenseStore';
import { Plus, Filter, Search } from 'lucide-react';

export const Samples = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { samples, getSampleById } = useSampleStore();
  const { tracks } = useTrackStore();
  const { licenses } = useLicenseStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSamples = samples.filter((sample) =>
    sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sample.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (id === 'new') {
    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="采样素材库" />
        <main className="flex-1 p-6 overflow-auto">
          <SampleForm />
        </main>
      </div>
    );
  }

  if (id) {
    const sample = getSampleById(id);
    if (!sample) {
      return (
        <div className="flex-1 flex flex-col min-h-screen">
          <Header title="采样素材库" />
          <main className="flex-1 p-6 overflow-auto">
            <p className="text-gray-400">素材不存在</p>
          </main>
        </div>
      );
    }

    const relatedTracks = tracks.filter((t) => t.sampleIds.includes(id));
    const relatedLicenses = licenses.filter((l) =>
      l.trackIds.some((tid) => tracks.find((t) => t.id === tid)?.sampleIds.includes(id))
    );

    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="采样素材库" />
        <main className="flex-1 p-6 overflow-auto">
          <SampleDetail
            sample={sample}
            relatedTracks={relatedTracks}
            relatedLicenses={relatedLicenses}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="采样素材库" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索素材..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg bg-secondary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 w-64 transition-colors"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
          <button
            onClick={() => navigate('/samples/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增素材
          </button>
        </div>

        <SampleList samples={filteredSamples} />
      </main>
    </div>
  );
};
