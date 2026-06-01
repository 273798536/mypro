import { useEffect } from 'react';
import { Header } from '@/components/common/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RiskList } from '@/components/dashboard/RiskList';
import { useSampleStore } from '@/store/useSampleStore';
import { useTrackStore } from '@/store/useTrackStore';
import { useLicenseStore } from '@/store/useLicenseStore';
import { useAlertStore } from '@/store/useAlertStore';
import { getRiskCountByType } from '@/utils/riskDetector';
import { Music, Disc, FileCheck, AlertTriangle, Plus, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { samples } = useSampleStore();
  const { tracks } = useTrackStore();
  const { licenses } = useLicenseStore();
  const { alerts, detectAllRisks, dismissAlert } = useAlertStore();
  const navigate = useNavigate();

  useEffect(() => {
    detectAllRisks();
  }, [detectAllRisks]);

  const riskCounts = getRiskCountByType(alerts);
  const totalRisks = alerts.length;

  const quickActions = [
    { label: '新增采样素材', icon: Plus, action: () => navigate('/samples/new') },
    { label: '新增曲目项目', icon: Plus, action: () => navigate('/tracks/new') },
    { label: '新增授权报告', icon: Plus, action: () => navigate('/licenses/new') },
    { label: '开始追溯', icon: GitBranch, action: () => navigate('/trace') },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="总览仪表盘" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="采样素材总数"
            value={samples.length}
            icon={Music}
            color="accent"
          />
          <StatsCard
            title="曲目项目总数"
            value={tracks.length}
            icon={Disc}
            color="success"
          />
          <StatsCard
            title="授权报告总数"
            value={licenses.length}
            icon={FileCheck}
            color="accent"
          />
          <StatsCard
            title="待处理风险"
            value={totalRisks}
            icon={AlertTriangle}
            color={totalRisks > 0 ? 'warning' : 'success'}
          />
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">风险分布</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">授权过期</span>
                  <span className="text-danger">{riskCounts.expired} 项</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-danger transition-all duration-500"
                    style={{ width: `${totalRisks > 0 ? (riskCounts.expired / totalRisks) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">素材重名</span>
                  <span className="text-warning">{riskCounts.duplicate} 项</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning transition-all duration-500"
                    style={{ width: `${totalRisks > 0 ? (riskCounts.duplicate / totalRisks) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">曲目漏记</span>
                  <span className="text-danger">{riskCounts.missingLicense} 项</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-danger transition-all duration-500"
                    style={{ width: `${totalRisks > 0 ? (riskCounts.missingLicense / totalRisks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary/50 rounded-xl p-6 border border-white/10 col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-white">快速操作</h3>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="flex items-center gap-3 p-4 rounded-lg bg-primary/50 border border-white/10 hover:border-accent/50 hover:bg-accent/10 transition-all duration-200 group"
                >
                  <action.icon className="w-5 h-5 text-gray-400 group-hover:text-accent transition-colors" />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold mb-4 text-white">风险预警</h3>
          <RiskList alerts={alerts} onDismiss={dismissAlert} />
        </div>
      </main>
    </div>
  );
};
