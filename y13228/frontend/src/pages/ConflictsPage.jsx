import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Space, Modal, Input, Select, App as AntApp, List, Avatar, Divider } from 'antd';
import { TeamOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { conflictsAPI, resolveConflictAPI, updateTrackAPI } from '../api.js';

export default function ConflictsPage({ refreshKey, onResolve }) {
  const { message, modal } = AntApp.useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('unresolved');

  const load = () => {
    setLoading(true);
    const params = filter === 'all' ? {} : { resolved: filter === 'resolved' ? 1 : 0 };
    conflictsAPI(filter === 'all' ? undefined : (filter === 'resolved' ? 1 : 0)).then(r => { setList(r); }).finally(() => setLoading(false));
  };
  useEffect(load, [refreshKey, filter]);

  const openResolve = (cf) => {
    modal.confirm({
      title: `解决别名冲突：${cf.alias_name}`,
      width: 580,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>冲突曲目：</p>
          <List
            size="small"
            style={{ marginBottom: 16 }}
            dataSource={cf.tracks}
            renderItem={t => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<TeamOutlined />} />}
                  title={<b>{t.track_name}</b>}
                  description={`ID#${t.id} | 文件：${t.file_name || '缺失'} | 状态：${t.status || 'pending'}`}
                />
              </List.Item>
            )}
          />
          <Divider style={{ margin: '8px 0 12px' }} />
          <p style={{ marginBottom: 8 }}>保留哪一条（其他条目的 duplicate_alias 标记会清除）：</p>
          <Select id="keep-select" style={{ width: '100%' }} placeholder="选择保留的曲目ID"
            options={cf.tracks.map(t => ({ value: t.id, label: `#${t.id} - ${t.track_name}` }))} />
          <p style={{ marginTop: 12, marginBottom: 8 }}>处理说明：</p>
          <Input id="conflict-remark" placeholder="例如：保留条目A，条目B为旧说法已作废，和阿蓝确认过" />
        </div>
      ),
      okText: '确认解决',
      onOk: async () => {
        const keep = document.getElementById('keep-select').value;
        const remark = document.getElementById('conflict-remark').value;
        await resolveConflictAPI(cf.id, { remark, keep_track_id: keep });
        message.success('已解决冲突');
        onResolve && onResolve();
      },
    });
  };

  const unresolved = list.filter(c => !c.resolved).length;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <Space>
          <Button type={filter === 'unresolved' ? 'primary' : 'default'} onClick={() => setFilter('unresolved')}>
            未解决 {filter === 'unresolved' && unresolved > 0 ? `(${unresolved})` : ''}
          </Button>
          <Button type={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')}>全部 ({list.length})</Button>
          <Button type={filter === 'resolved' ? 'primary' : 'default'} onClick={() => setFilter('resolved')}>已解决</Button>
        </Space>
        <Button style={{ marginLeft: 'auto' }} onClick={load}>刷新</Button>
      </div>

      {loading ? <div className="empty-tip">加载中...</div> :
        list.length === 0 ? <div className="empty-tip">🎉 当前没有别名冲突！</div> :
        list.map(cf => (
          <div key={cf.id} className={`conflict-panel ${cf.resolved ? 'resolved' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <Space>
                  {cf.resolved
                    ? <Tag color="green" icon={<CheckCircleOutlined />}>已解决</Tag>
                    : <Tag color="red" icon={<WarningOutlined />}>未解决</Tag>}
                  <Tag color="magenta" style={{ fontSize: 14, padding: '2px 10px' }}>
                    冲突别名：<b>{cf.alias_name}</b>
                  </Tag>
                  <Tag>{cf.tracks.length} 条曲目共用此别名</Tag>
                </Space>
              </div>
              {!cf.resolved && (
                <Button type="primary" size="small" onClick={() => openResolve(cf)}>解决冲突</Button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cf.tracks.length, 3)}, 1fr)`, gap: 10 }}>
              {cf.tracks.map(t => (
                <Card key={t.id} size="small" title={<span>#{t.id} {t.track_name}</span>} style={{ background: '#fff' }}>
                  <div className="small-desc">文件名：{t.file_name || <Tag color="orange">缺失</Tag>}</div>
                  <div className="small-desc">状态：{t.status || 'pending'}</div>
                </Card>
              ))}
            </div>
            {cf.resolved && cf.resolved_remark && (
              <div style={{ marginTop: 10, padding: 10, background: '#f6ffed', borderRadius: 4 }}>
                <span className="small-desc">处理说明：{cf.resolved_remark}</span>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <span className="small-desc">发现于 {cf.created_at}</span>
            </div>
          </div>
        ))
      }

      <div style={{ marginTop: 20, padding: 16, background: '#fff0f6', borderRadius: 6, border: '1px solid #ffadd2' }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: '#9e1068' }}>⚠️ 别名冲突的处理原则</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#780650' }}>
          <li><b>单独拎出</b>：所有命中别名重复的记录，不会被单独放这里，不会混进「正常导出」里。</li>
          <li><b>来源和状态保住</b>：即使命中冲突的曲目，其「来源」和「处理状态」字段会完整保留。</li>
          <li><b>导出清单重新对齐</b>：解决时选择「保留条目」后，被保留的条目的 anomaly_type/remark/auth_remark 会重新生效到最终清单。</li>
          <li><b>历史留痕</b>：所有修改都会写入 track_history，下一班看得见阿蓝之前的临时判断。</li>
        </ul>
      </div>
    </div>
  );
}
