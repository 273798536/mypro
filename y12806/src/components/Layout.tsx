import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import {
  Beaker,
  ChevronRight,
  User,
  FlaskConical,
  AlertTriangle,
  ScanLine,
  PlayCircle,
} from 'lucide-react';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    lots,
    bands,
    samples,
    isDemoMode,
    toggleDemoMode,
    fetchAllData,
    selectLot,
  } = useWorkbenchStore();

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const lotStats = useMemo(() => {
    return lots.map((lot) => {
      const lotSamples = samples.filter((s) => s.lot_id === lot.id);
      const lotSampleIds = lotSamples.map((s) => s.id);
      const lotBands = bands.filter((b) => lotSampleIds.includes(b.sample_id));
      const pendingCount = lotBands.filter((b) => b.confirm_status === 'pending').length;
      const anomalyCount = lotBands.filter(
        (b) => b.needs_supplement || b.confirm_status === 'rejected'
      ).length;
      return { ...lot, pendingCount, anomalyCount, sampleCount: lotSamples.length };
    });
  }, [lots, bands, samples]);

  const breadcrumbItems = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const items: { label: string; path: string }[] = [{ label: '总览', path: '/' }];

    if (pathParts[0] === 'lot') {
      const lot = lots.find((l) => l.id === pathParts[1]);
      items.push({ label: lot ? lot.lot_number : '批号详情', path: location.pathname });
    } else if (pathParts[0] === 'compare') {
      items.push({ label: '并排对比', path: location.pathname });
    } else if (pathParts[0] === 'review') {
      items.push({ label: '复核工作台', path: location.pathname });
    } else if (pathParts[0] === 'export') {
      items.push({ label: '下载中心', path: location.pathname });
    } else if (pathParts[0] === 'demo') {
      items.push({ label: '演示模式', path: location.pathname });
    }

    return items;
  }, [location.pathname, lots]);

  const handleLotClick = (lotId: string) => {
    selectLot(lotId);
    navigate(`/lot/${lotId}`);
  };

  return (
    <div className="min-h-screen app-bg flex flex-col">
      {isDemoMode && <div className="demo-watermark" />}

      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 border-b border-slate-200/60">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link to="/" className="hover:text-lab-700 transition-colors">
              <FlaskConical className="w-5 h-5 text-lab-700" />
            </Link>
            <nav className="flex items-center gap-1">
              {breadcrumbItems.map((item, idx) => (
                <div key={item.path + idx} className="flex items-center gap-1">
                  {idx > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                  {idx === breadcrumbItems.length - 1 ? (
                    <span className="text-slate-800 font-medium">{item.label}</span>
                  ) : (
                    <Link
                      to={item.path}
                      className="hover:text-lab-700 transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleDemoMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isDemoMode
                  ? 'bg-lab-danger text-white shadow-md shadow-lab-danger/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              {isDemoMode ? '演示中' : '演示模式'}
            </button>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lab-700 to-lab-900 flex items-center justify-center text-white">
                <User className="w-4 h-4" />
              </div>
              <div className="text-sm leading-tight">
                <div className="font-medium text-slate-800">王博士</div>
                <div className="text-xs text-slate-500">生信分析师</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="w-[260px] shrink-0 border-r border-slate-200/60 bg-white/40 backdrop-blur-sm flex flex-col"
        >
          <div className="p-4 border-b border-slate-200/60">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-lab-700" />
              试剂批号
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
            {lotStats.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                暂无批号数据
              </div>
            ) : (
              <ul className="space-y-1 px-2">
                {lotStats.map((lot) => {
                  const isActive = location.pathname === `/lot/${lot.id}`;
                  return (
                    <li key={lot.id}>
                      <button
                        onClick={() => handleLotClick(lot.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                          isActive
                            ? 'bg-lab-700/10 border border-lab-700/20'
                            : 'hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div
                              className={`text-sm font-medium truncate ${
                                isActive ? 'text-lab-700' : 'text-slate-700'
                              }`}
                            >
                              {lot.lot_number}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 truncate">
                              {lot.reagent_name} · {lot.sampleCount}样本
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {lot.pendingCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-lab-warn/15 text-lab-warn text-xs font-medium">
                                {lot.pendingCount}待确
                              </span>
                            )}
                            {lot.anomalyCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-lab-danger/15 text-lab-danger text-xs font-medium">
                                <AlertTriangle className="w-3 h-3 mr-0.5" />
                                {lot.anomalyCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="p-3 border-t border-slate-200/60 space-y-2">
            <Link
              to="/review"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-lab-confirm/10 hover:text-lab-confirm transition-all group"
            >
              <ScanLine className="w-4 h-4 group-hover:scale-110 transition-transform" />
              复核工作台
            </Link>
            <Link
              to="/demo"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-lab-supplement/10 hover:text-lab-supplement transition-all group"
            >
              <PlayCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
              坏数据演示
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
