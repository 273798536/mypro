import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Annotate from "@/pages/Annotate";
import Review from "@/pages/Review";
import DataManagement from "@/pages/DataManagement";
import ExportCenter from "@/pages/ExportCenter";

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#165DFF',
          borderRadius: 2,
          fontFamily: '"Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/annotate/:id" element={<Annotate />} />
            <Route path="/review/:id" element={<Review />} />
            <Route path="/data" element={<DataManagement />} />
            <Route path="/export/:id" element={<ExportCenter />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
