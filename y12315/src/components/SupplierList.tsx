import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Supplier } from '../types';

const SupplierList: React.FC = () => {
  const { suppliers, selectedSupplier, setSelectedSupplier, updateSupplier, deleteSupplier, addSupplier } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    address: '',
    registeredCapital: '',
    establishmentDate: '',
    businessScope: '',
    qualificationLevel: '',
    riskNotes: '',
    quotation: '',
    quotationStatus: 'complete' as 'complete' | 'missing' | 'partial',
    sourceReference: ''
  });

  const handleAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      contact: '',
      phone: '',
      email: '',
      address: '',
      registeredCapital: '',
      establishmentDate: '',
      businessScope: '',
      qualificationLevel: '',
      riskNotes: '',
      quotation: '',
      quotationStatus: 'complete',
      sourceReference: ''
    });
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      registeredCapital: supplier.registeredCapital,
      establishmentDate: supplier.establishmentDate,
      businessScope: supplier.businessScope,
      qualificationLevel: supplier.qualificationLevel,
      riskNotes: supplier.riskNotes,
      quotation: supplier.quotation?.toString() || '',
      quotationStatus: supplier.quotationStatus,
      sourceReference: supplier.sourceReference
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        ...formData,
        quotation: formData.quotation ? parseFloat(formData.quotation) : undefined
      });
    } else {
      addSupplier({
        ...formData,
        quotation: formData.quotation ? parseFloat(formData.quotation) : undefined
      });
    }
    setShowModal(false);
  };

  const getQuotationBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <span className="badge badge-success">报价完整</span>;
      case 'partial':
        return <span className="badge badge-warning">部分报价</span>;
      case 'missing':
        return <span className="badge badge-danger">报价缺失</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">供应商资料管理</h2>
          <button className="btn btn-primary" onClick={handleAdd}>
            + 新增供应商
          </button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>供应商名称</th>
              <th>联系人</th>
              <th>联系方式</th>
              <th>资质等级</th>
              <th>注册资本</th>
              <th>报价状态</th>
              <th>报价金额</th>
              <th>资料来源</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(supplier => (
              <tr key={supplier.id}>
                <td>
                  <span
                    className="link"
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    {supplier.name}
                  </span>
                </td>
                <td>{supplier.contact}</td>
                <td>{supplier.phone}</td>
                <td>{supplier.qualificationLevel}</td>
                <td>{supplier.registeredCapital}</td>
                <td>{getQuotationBadge(supplier.quotationStatus)}</td>
                <td>
                  {supplier.quotation
                    ? `¥${supplier.quotation.toLocaleString()}`
                    : '-'}
                </td>
                <td className="source-reference">{supplier.sourceReference}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEdit(supplier)}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteSupplier(supplier.id)}
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {suppliers.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">暂无供应商数据，点击上方按钮添加</div>
          </div>
        )}
      </div>

      {selectedSupplier && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">供应商详情 - {selectedSupplier.name}</h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedSupplier(null)}
            >
              关闭
            </button>
          </div>

          <div className="grid-2">
            <div>
              <div className="detail-row">
                <span className="detail-label">供应商名称</span>
                <span className="detail-value">{selectedSupplier.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">联系人</span>
                <span className="detail-value">{selectedSupplier.contact}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">联系电话</span>
                <span className="detail-value">{selectedSupplier.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">电子邮箱</span>
                <span className="detail-value">{selectedSupplier.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">公司地址</span>
                <span className="detail-value">{selectedSupplier.address}</span>
              </div>
            </div>
            <div>
              <div className="detail-row">
                <span className="detail-label">注册资本</span>
                <span className="detail-value">{selectedSupplier.registeredCapital}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">成立日期</span>
                <span className="detail-value">{selectedSupplier.establishmentDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">经营范围</span>
                <span className="detail-value">{selectedSupplier.businessScope}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">资质等级</span>
                <span className="detail-value">{selectedSupplier.qualificationLevel}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">报价状态</span>
                <span className="detail-value">{getQuotationBadge(selectedSupplier.quotationStatus)}</span>
              </div>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-label">报价金额</span>
            <span className="detail-value">
              {selectedSupplier.quotation
                ? `¥${selectedSupplier.quotation.toLocaleString()}`
                : '-'}
            </span>
          </div>

          <div className="detail-row">
            <span className="detail-label">风险备注</span>
            <span className="detail-value">{selectedSupplier.riskNotes || '无'}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">资料来源</span>
            <span className="detail-value source-reference">
              {selectedSupplier.sourceReference}
            </span>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSupplier ? '编辑供应商' : '新增供应商'}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">供应商名称</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">联系人</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">联系电话</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">电子邮箱</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">注册资本</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.registeredCapital}
                  onChange={(e) => setFormData({ ...formData, registeredCapital: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">成立日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.establishmentDate}
                  onChange={(e) => setFormData({ ...formData, establishmentDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">资质等级</label>
                <select
                  className="form-select"
                  value={formData.qualificationLevel}
                  onChange={(e) => setFormData({ ...formData, qualificationLevel: e.target.value })}
                >
                  <option value="">请选择</option>
                  <option value="特级">特级</option>
                  <option value="一级">一级</option>
                  <option value="二级">二级</option>
                  <option value="三级">三级</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">报价金额（元）</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quotation}
                  onChange={(e) => setFormData({ ...formData, quotation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">报价状态</label>
                <select
                  className="form-select"
                  value={formData.quotationStatus}
                  onChange={(e) => setFormData({ ...formData, quotationStatus: e.target.value as any })}
                >
                  <option value="complete">报价完整</option>
                  <option value="partial">部分报价</option>
                  <option value="missing">报价缺失</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">资料来源</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.sourceReference}
                  onChange={(e) => setFormData({ ...formData, sourceReference: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">公司地址</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">经营范围</label>
              <input
                type="text"
                className="form-input"
                value={formData.businessScope}
                onChange={(e) => setFormData({ ...formData, businessScope: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">风险备注</label>
              <textarea
                className="form-textarea"
                value={formData.riskNotes}
                onChange={(e) => setFormData({ ...formData, riskNotes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierList;
