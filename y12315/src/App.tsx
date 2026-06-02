import { useEffect } from 'react';
import { useAppStore } from './store';
import SupplierList from './components/SupplierList';
import CriteriaMatrix from './components/CriteriaMatrix';
import ScoringPanel from './components/ScoringPanel';
import RankingPanel from './components/RankingPanel';
import ReportExport from './components/ReportExport';

function App() {
  const { activeTab, setActiveTab, loadSampleData, suppliers } = useAppStore();

  useEffect(() => {
    if (suppliers.length === 0) {
      loadSampleData();
    }
  }, []);

  const tabs = [
    { id: 'suppliers' as const, label: '供应商资料', icon: '🏢' },
    { id: 'criteria' as const, label: '判断矩阵', icon: '📊' },
    { id: 'scoring' as const, label: '指标评分', icon: '✏️' },
    { id: 'ranking' as const, label: '综合排名', icon: '🏆' },
    { id: 'report' as const, label: '报告导出', icon: '📄' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'suppliers':
        return <SupplierList />;
      case 'criteria':
        return <CriteriaMatrix />;
      case 'scoring':
        return <ScoringPanel />;
      case 'ranking':
        return <RankingPanel />;
      case 'report':
        return <ReportExport />;
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>层次分析评审会</h1>
            <p>基于AHP层次分析法的供应商综合评审系统 - 解决矩阵不一致、权重追溯、排名解释问题</p>
          </div>
          <button className="btn load-btn" onClick={loadSampleData}>
            🔄 重置样例数据
          </button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}

      <div style={{ marginTop: '40px', padding: '20px', background: 'white', borderRadius: '12px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
        <p>📋 系统功能说明</p>
        <p style={{ marginTop: '8px' }}>
          1. 供应商资料：管理供应商基础信息，支持新增、编辑、删除，查看详情和风险备注 | 
          2. 判断矩阵：构建AHP判断矩阵，实时计算一致性，支持子矩阵 | 
          3. 指标评分：对各供应商进行指标评分，支持备注和资料来源溯源 | 
          4. 综合排名：查看排名结果、得分明细、图表对比，支持筛选和历史版本 | 
          5. 报告导出：生成评审报告，导出Excel和文本格式，查看权重修改影响
        </p>
      </div>
    </div>
  );
}

export default App;
