import { Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

const EquipmentPanel = ({ equipment }) => {
  const getStatusBadge = (status) => {
    const config = {
      working: { text: '正常使用', className: 'success', icon: CheckCircle },
      maintenance: { text: '维护中', className: 'pending', icon: AlertTriangle }
    };
    const statusConfig = config[status] || config.working;
    const Icon = statusConfig.icon;
    return (
      <span className={`status-badge ${statusConfig.className}`}>
        <Icon size={12} style={{ marginRight: '4px' }} />
        {statusConfig.text}
      </span>
    );
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2><Wrench size={18} style={{ marginRight: '0.5rem' }} />设备清单</h2>
      </div>
      <div className="panel-body">
        <table>
          <thead>
            <tr>
              <th>设备编号</th>
              <th>设备名称</th>
              <th>型号</th>
              <th>状态</th>
              <th>上次校准</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.model}</td>
                <td>{getStatusBadge(item.status)}</td>
                <td>{item.lastCalibration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EquipmentPanel;
