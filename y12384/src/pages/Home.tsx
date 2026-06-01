import { Layout } from '@/components/Layout';
import { OverviewPage } from '@/pages/OverviewPage';
import { ConflictsPage } from '@/pages/ConflictsPage';
import { VersionsPage } from '@/pages/VersionsPage';
import { ReportPage } from '@/pages/ReportPage';
import { usePlaylistStore } from '@/store/usePlaylistStore';

export default function Home() {
  const { activeTab } = usePlaylistStore();

  return (
    <Layout>
      {activeTab === 'overview' && <OverviewPage />}
      {activeTab === 'conflicts' && <ConflictsPage />}
      {activeTab === 'versions' && <VersionsPage />}
      {activeTab === 'report' && <ReportPage />}
    </Layout>
  );
}