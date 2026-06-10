import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { reportApi } from '../api';

const navItems = [
  { path: '/', label: '总览', icon: '📊' },
  { path: '/samples', label: '样本管理', icon: '🔬' },
  { path: '/batches', label: '批次分析', icon: '📦' },
  { path: '/handover', label: '月底转交', icon: '📋' },
];

export default function Layout() {
  const navigate = useNavigate();
  const handleExportReport = async () => {
    try {
      const blob = await reportApi.exportReport();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `病理切片复核报告-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('导出失败', e);
    }
  };
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          padding: '24px 0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '0 24px 24px',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🔬</span>
            <span>病理切片区域复核</span>
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12,
              color: 'var(--color-text-secondary)',
            }}
          >
            Pathological Review System
          </p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              })}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '24px', fontSize: 12, color: 'var(--color-text-muted)' }}>
          <div>版本 1.0.0</div>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 32px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>病理切片区域复核</h2>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={handleExportReport}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                background: 'var(--color-white)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              📄 导出报告
            </button>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              李
            </div>
          </div>
        </header>
        <div style={{ padding: 24 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
