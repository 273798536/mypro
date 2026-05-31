import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import TaskList from '@/pages/TaskList';
import CalculationDetail from '@/pages/CalculationDetail';
import ReportOutput from '@/pages/ReportOutput';
import HistoryList from '@/pages/HistoryList';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<TaskList />} />
          <Route path="/tasks/:taskId" element={<CalculationDetail />} />
          <Route path="/tasks/:taskId/report" element={<ReportOutput />} />
          <Route path="/history" element={<HistoryList />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">无人机风场返航计算系统</h2>
      <div className="bg-primary/30 rounded-xl border border-accent/20 p-6 space-y-4 text-gray-300">
        <p>本系统用于计算无人机在风场环境下的返航能耗与安全阈值，支持以下功能：</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>导入混合数据包（航点计划、载荷重量、风场数据）</li>
          <li>能耗模型计算，含逆风突变检测</li>
          <li>返航阈值动态计算，含电池老化因子</li>
          <li>风险检测（逆风突变、电池老化、禁飞区绕行等）</li>
          <li>人工修正留痕，每条修正记录原因和操作人</li>
          <li>来源追溯链，每条判断可追踪到原始数据包</li>
          <li>内容哈希去重，相同输入不会产生重复结论</li>
          <li>SQLite 持久化存储，重启服务后历史记录不丢失</li>
        </ul>
        <p className="text-sm text-gray-500 mt-4">v1.0.0 · 技术栈：React + TypeScript + Flask + SQLite</p>
      </div>
    </div>
  );
}
