import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from "@/components/Layout";
import ImportPage from "@/pages/ImportPage";
import AnomaliesPage from "@/pages/AnomaliesPage";
import DetailPage from "@/pages/DetailPage";
import ReportPage from "@/pages/ReportPage";

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<ImportPage />} />
            <Route path="anomalies" element={<AnomaliesPage />} />
            <Route path="detail/:id" element={<DetailPage />} />
            <Route path="report" element={<ReportPage />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
