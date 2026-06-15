import React, { useEffect, useState } from 'react';
import { List, Tag, Select, Button, Space, Modal, Tabs, Input, Avatar } from 'antd';
import { SearchOutlined, UserOutlined, DiffOutlined } from '@ant-design/icons';

import { royaltyApi } from '../api/index.js';
import { formatTime } from '../utils/components.jsx';

const actionLabels = {
  create: { text: '新增', color: 'green' },
  update: { text: '编辑', color: 'blue' },
  delete: { text: '删除', color: 'red' },
  import: { text: '导入', color: 'purple' },
  snapshot: { text: '快照', color: 'cyan' },
  restore: { text: '恢复版本', color: 'orange' }
};

export default function HistoryPage() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffPair, setDiffPair] = useState(null);

  async function load() {
    const params = {};
    if (filter) params.limit = 200;
    const data = await royaltyApi.getHistory(params);
    setList(data);
  }

  useEffect(() => {
    load();
  }, []);

  function openDiff(h) {
    setDiffPair(h);
    setDiffOpen(true);
  }

  const filtered = list.filter((h) => {
    if (filter && h.action !== filter) return false;
    if (keyword) {
      const txt = JSON.stringify(h).toLowerCase();
      if (!txt.includes(keyword.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="page-container">
      <Space style={{ marginBottom: 16 }} wrap>
        <h2 style={{ margin: 0 }}>📝 操作历史（社区公示前复盘时能解释给接手同事）</h2>
        <Space style={{ marginLeft: 'auto' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索备注或 ID"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            placeholder="按操作类型筛选"
            style={{ width: 160 }}
            value={filter || undefined}
            onChange={(v) => setFilter(v || '')}
          >
            {Object.entries(actionLabels).map(([k, v]) => (
              <Select.Option key={k} value={k}>
                {v.text}
              </Select.Option>
            ))}
          </Select>
          <Button onClick={load}>刷新</Button>
        </Space>
      </Space>

      <List
        dataSource={filtered}
        renderItem={(h) => {
          const cfg = actionLabels[h.action] || { text: h.action, color: 'default' };
          return (
            <div className="history-item">
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space align="start">
                  <Avatar icon={<UserOutlined />} size="small" />
                  <div>
                    <Space>
                      <Tag color={cfg.color}>{cfg.text}</Tag>
                      <strong>{h.operator}</strong>
                      <span style={{ color: '#8c8c8c', fontSize: 12 }}>{formatTime(h.timestamp)}</span>
                    </Space>
                    <div style={{ marginTop: 6, color: '#595959', fontSize: 13 }}>
                      {h.action === 'import' && (
                        <span>
                          从文件 <code>{h.source}</code> 导入 {h.count} 条记录
                          {h.snapshotId && (
                            <span style={{ marginLeft: 8, color: '#8c8c8c' }}>
                              （版本快照：{h.snapshotId.slice(0, 8)}）
                            </span>
                          )}
                        </span>
                      )}
                      {h.action === 'snapshot' && <span>创建版本快照，共 {h.count} 条记录</span>}
                      {h.action === 'restore' && (
                        <span>
                          恢复到版本 {h.sourceVersionId?.slice(0, 8)}，记录数从 {h.beforeVersionCount} →{' '}
                          {h.afterVersionCount}
                        </span>
                      )}
                      {h.action === 'create' && <span>新增记录 ID: {h.recordId?.slice(0, 8)}</span>}
                      {h.action === 'update' && <span>修改记录 ID: {h.recordId?.slice(0, 8)}</span>}
                      {h.action === 'delete' && <span>删除记录 ID: {h.recordId?.slice(0, 8)}</span>}
                    </div>
                  </div>
                </Space>
                {(h.before || h.after) && (
                  <Button size="small" icon={<DiffOutlined />} onClick={() => openDiff(h)}>
                    查看变化
                  </Button>
                )}
              </Space>
            </div>
          );
        }}
      />

      <Modal
        title="历史变化对比"
        open={diffOpen}
        onCancel={() => setDiffOpen(false)}
        footer={null}
        width={720}
      >
        {diffPair && (
          <Tabs
            items={[
              diffPair.before && {
                key: 'before',
                label: '变化前',
                children: (
                  <div className="raw-diff">
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(diffPair.before, null, 2)}
                    </pre>
                  </div>
                )
              },
              diffPair.after && {
                key: 'after',
                label: '变化后',
                children: (
                  <div className="raw-diff">
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(diffPair.after, null, 2)}
                    </pre>
                  </div>
                )
              }
            ].filter(Boolean)}
          />
        )}
      </Modal>
    </div>
  );
}
