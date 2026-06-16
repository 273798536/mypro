import { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { LocationPoint } from '../types';

interface CreatePlanModalProps {
  onClose: () => void;
}

const PRESET_LOCATIONS: Array<{
  name: string;
  address: string;
  lat: number;
  lng: number;
}> = [
  {
    name: '老街口消防改造方案',
    address: '老街口（正街北口）',
    lat: 30.2638,
    lng: 120.1532,
  },
  {
    name: '老槐树周边消防方案',
    address: '老槐树旁',
    lat: 30.2642,
    lng: 120.1541,
  },
  {
    name: '居委会片区消防评估',
    address: '老街社区居委会',
    lat: 30.2635,
    lng: 120.1525,
  },
];

export function CreatePlanModal({ onClose }: CreatePlanModalProps) {
  const { createPlan, loading } = useApp();
  const [step, setStep] = useState<'select' | 'custom'>('select');
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customLat, setCustomLat] = useState('30.2638');
  const [customLng, setCustomLng] = useState('120.1532');

  const handleCreate = (loc: { name: string; location: LocationPoint }) => {
    createPlan(loc.name, loc.location);
    onClose();
  };

  const handleCustomCreate = () => {
    if (!customName || !customAddress) return;
    handleCreate({
      name: customName,
      location: {
        address: customAddress,
        lat: parseFloat(customLat) || 0,
        lng: parseFloat(customLng) || 0,
      },
    });
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 新建老街消防方案比选</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="onboarding-steps">
          <div className={`step ${step === 'select' ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">选择方案</div>
          </div>
          <div className="step-line" />
          <div className={`step ${step === 'custom' ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">自定义信息</div>
          </div>
        </div>

        <div className="modal-body">
          {step === 'select' ? (
            <>
              <div className="onboarding-tip">
                💡 <strong>材料入口引导：</strong>
                先选择一个常用方案模板，或从下方自定义创建。
                <br />
                所有场景标注、侧边说明、数据接口将使用统一数据源。
              </div>
              <div className="preset-list">
                {PRESET_LOCATIONS.map((preset, idx) => (
                  <div
                    key={idx}
                    className="preset-card"
                    onClick={() =>
                      handleCreate({
                        name: preset.name,
                        location: {
                          address: preset.address,
                          lat: preset.lat,
                          lng: preset.lng,
                        },
                      })
                    }
                  >
                    <div className="preset-icon">🏛️</div>
                    <div className="preset-name">{preset.name}</div>
                    <div className="preset-address">{preset.address}</div>
                  </div>
                ))}
                <div className="preset-card preset-custom" onClick={() => setStep('custom')}>
                  <div className="preset-icon">✏️</div>
                  <div className="preset-name">自定义方案</div>
                  <div className="preset-address">手动输入名称和地点</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-row">
                <label>方案名称 *</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="如：老街口消防改造方案比选"
                />
              </div>
              <div className="form-row">
                <label>地点地址 *</label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={e => setCustomAddress(e.target.value)}
                  placeholder="如：老街口（正街北口）"
                />
                <div className="form-tip">
                  提示：同一地点请使用标准名称，避免出现"老街口 / 街口 / 正街北口"等多种写法
                </div>
              </div>
              <div className="form-row-inline">
                <div className="form-row">
                  <label>纬度</label>
                  <input
                    type="text"
                    value={customLat}
                    onChange={e => setCustomLat(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label>经度</label>
                  <input
                    type="text"
                    value={customLng}
                    onChange={e => setCustomLng(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          {step === 'custom' && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep('select')}>
                ← 返回
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCustomCreate}
                disabled={loading || !customName || !customAddress}
              >
                创建方案
              </button>
            </>
          )}
        </div>

        <div className="onboarding-footer">
          <strong>异常出口说明：</strong>
          若操作过程中出现数据冲突，系统会自动挂起方案并提示复核人确认，不会给出假稳定结论。
        </div>
      </div>
    </div>
  );
}
