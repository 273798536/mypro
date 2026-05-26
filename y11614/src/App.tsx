import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataImport from './pages/DataImport';
import TaxPeriods from './pages/TaxPeriods';
import Calculation from './pages/Calculation';
import Exceptions from './pages/Exceptions';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif'
        }
      }}
    >
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/import" element={<DataImport />} />
            <Route path="/tax-periods" element={<TaxPeriods />} />
            <Route path="/calculation" element={<Calculation />} />
            <Route path="/exceptions" element={<Exceptions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}
