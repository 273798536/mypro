import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CalendarPage } from './pages/CalendarPage';
import { SamplesPage } from './pages/SamplesPage';
import { SampleDetailPage } from './pages/SampleDetailPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { ReviewPage } from './pages/ReviewPage';

/**
 * 应用根组件
 * 配置 BrowserRouter 和所有路由
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 首页：投喂日历 */}
        <Route path="/" element={<CalendarPage />} />

        {/* 样本管理列表页 */}
        <Route path="/samples" element={<SamplesPage />} />

        {/* 样本独立详情页 */}
        <Route path="/samples/:id" element={<SampleDetailPage />} />

        {/* AI/ML 工作流页 */}
        <Route path="/workflow" element={<WorkflowPage />} />

        {/* 复核与报告页 */}
        <Route path="/review" element={<ReviewPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
