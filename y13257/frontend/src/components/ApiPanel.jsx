import React, { useState } from 'react';

function ApiPanel({ apiCalls }) {
  const [expandedIndex, setExpandedIndex] = useState(0);

  if (!apiCalls || apiCalls.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔌</div>
        <div>暂无接口调用记录</div>
      </div>
    );
  }

  return (
    <div>
      <div className="tabs">
        {apiCalls.map((call, idx) => (
          <div
            key={idx}
            className={`tab ${expandedIndex === idx ? 'active' : ''}`}
            onClick={() => setExpandedIndex(idx)}
            style={{ fontSize: '0.8rem' }}
          >
            {call.method} {call.name}
          </div>
        ))}
      </div>

      {apiCalls.map((call, idx) => (
        expandedIndex === idx && (
          <div key={idx} className="api-panel">
            <div className="api-method">{call.method}</div>
            <div className="api-url">{call.url}</div>
            
            {call.params && (
              <div style={{ marginBottom: '0.8rem' }}>
                <div style={{ color: '#a78bfa', marginBottom: '0.3rem' }}>请求参数：</div>
                <pre>{JSON.stringify(call.params, null, 2)}</pre>
              </div>
            )}
            
            <div style={{ color: '#a78bfa', marginBottom: '0.3rem' }}>返回结果：</div>
            <pre>{JSON.stringify(call.response, null, 2)}</pre>
          </div>
        )
      ))}
    </div>
  );
}

export default ApiPanel;
