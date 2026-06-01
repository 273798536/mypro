import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Spin, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import DataEntry from "@/pages/DataEntry";
import AnomalyDetection from "@/pages/AnomalyDetection";
import AuditTrail from "@/pages/AuditTrail";
import ReportExport from "@/pages/ReportExport";
import { useAppStore } from "@/store";
import { COLORS } from "@/constants";

const { darkAlgorithm } = theme;

function AppContent() {
  const { initData, loading, error, initialized } = useAppStore();

  useEffect(() => {
    initData();
  }, [initData]);

  if (loading && !initialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Spin size="large" />
          <p className="text-white mt-4 font-medium">系统初始化中...</p>
          <p className="text-slate-400 mt-2 text-sm">正在加载数据，请稍候...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <p className="text-white text-lg">系统初始化失败</p>
          <p className="text-slate-400 mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/data-entry" element={<DataEntry />} />
        <Route path="/anomaly-detection" element={<AnomalyDetection />} />
        <Route path="/audit-trail" element={<AuditTrail />} />
        <Route path="/report-export" element={<ReportExport />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorPrimary: COLORS.primary,
          colorSuccess: COLORS.success,
          colorWarning: COLORS.warning,
          colorError: COLORS.danger,
          colorInfo: COLORS.primary,
          colorBgContainer: '#1E293B',
          colorBgElevated: '#1E293B',
          colorBgLayout: '#0F172A',
          colorBorder: '#334155',
          colorText: '#F1F5F9',
          colorTextSecondary: '#94A3B8',
          borderRadius: 6,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        },
        components: {
          Table: {
            colorBgContainer: '#1E293B',
            colorBorderSecondary: '#334155',
            headerBg: '#0F172A',
          },
          Card: {
            colorBgContainer: '#1E293B',
            colorBorderSecondary: '#334155',
          },
          Modal: {
            colorBgElevated: '#1E293B',
          },
          Select: {
            colorBgContainer: '#1E293B',
          },
          Input: {
            colorBgContainer: '#1E293B',
          },
          DatePicker: {
            colorBgContainer: '#1E293B',
          },
        },
      }}
    >
      <Router>
        <AppContent />
      </Router>
    </ConfigProvider>
  );
}
