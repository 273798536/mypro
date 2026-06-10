import { useParams } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function SampleDetail() {
  const { id } = useParams();

  return (
    <div className="flex flex-col items-center justify-center min-h-96">
      <div className="glass-card p-12 rounded-2xl text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-teal-400/10 flex items-center justify-center mx-auto mb-6">
          <Activity className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">样本详情</h2>
        <p className="text-lab-400">样本 ID: {id}</p>
        <p className="text-lab-400 mt-2">样本详情页面正在开发中...</p>
      </div>
    </div>
  );
}
