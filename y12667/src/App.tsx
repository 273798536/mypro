import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import RecordDetail from '@/pages/RecordDetail';
import RecordHistory from '@/pages/RecordHistory';
import ExportReport from '@/pages/ExportReport';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={
            <div className="p-8 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-4">关于救援绳索角度模拟工作台</h2>
              <div className="card p-6 space-y-4 text-slate-300 text-sm leading-relaxed">
                <p>
                  本工作台面向展馆讲解员，用于日常复核「救援绳索角度模拟」记录。系统打通了列表、详情、修正、历史、下载全流程，
                  避免周会前手工补锅的繁琐操作。
                </p>
                <h3 className="text-base font-semibold text-white mt-4">主要能力</h3>
                <ul className="list-disc list-inside space-y-1.5">
                  <li>记录列表：异常类型筛选、风险等级统计、关键词搜索</li>
                  <li>记录详情：绳索轨迹视图、角度趋势图，旁附文字明细解释，不依赖颜色识别</li>
                  <li>剖切查看与时间回放联动：补录剖面图后，回放会自动同步更新</li>
                  <li>数据修正：明确区分「补材料」与「改口径」操作指引</li>
                  <li>历史版本：版本对比、回滚，所有变更可追溯</li>
                  <li>导出报告：包含透明遮挡误读拦截的判定标准与原因说明，方便运维组离线查阅</li>
                </ul>
              </div>
            </div>
          } />
        </Route>
        <Route path="/records/:id" element={<RecordDetail />} />
        <Route path="/records/:id/history" element={<RecordHistory />} />
        <Route path="/records/:id/export" element={<ExportReport />} />
      </Routes>
    </Router>
  );
}
