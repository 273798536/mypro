import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, X, Ruler, Camera, AlertTriangle, FileText, User, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';
import { SandboxBreadcrumb } from '@/components/Breadcrumb';
import PageHeader from '@/components/PageHeader';
import { getUnitText, convertInclination } from '@/utils/helpers';
import type { Sandbox, UnitType, SandboxStatus, Screenshot, CameraView } from '@/types';

const imgPrompt = (desc: string) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(desc)}&image_size=landscape_16_9`;

export default function SandboxEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === undefined;

  const getSandbox = useSandboxStore((s) => s.getSandbox);
  const updateSandbox = useSandboxStore((s) => s.updateSandbox);
  const createSandbox = useSandboxStore((s) => s.createSandbox);
  const currentUser = useSandboxStore((s) => s.currentUser);

  const existing = isNew ? undefined : getSandbox(id || '');

  const [form, setForm] = useState<Omit<Sandbox, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    status: 'draft',
    inclination: 0,
    unit: 'degree',
    cameraView: { x: 0, y: 10, z: 25, zoom: 1 },
    screenshots: [],
    modelOverlap: false,
    notes: '',
  });
  const [changeReason, setChangeReason] = useState('');
  const [modifiedBy, setModifiedBy] = useState(currentUser);
  const [showAddScreenshot, setShowAddScreenshot] = useState(false);
  const [newScreenshot, setNewScreenshot] = useState({ description: '', judgment: '', url: '' });

  useEffect(() => {
    if (existing) {
      const { id: _, createdAt: __, updatedAt: ___, ...rest } = existing;
      setForm(rest);
    }
  }, [existing]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateCamera = <K extends keyof CameraView>(key: K, value: number) => {
    setForm((prev) => ({ ...prev, cameraView: { ...prev.cameraView, [key]: value } }));
  };

  const handleUnitToggle = (unit: UnitType) => {
    if (unit === form.unit) return;
    const converted = convertInclination(form.inclination, form.unit, unit);
    setForm((prev) => ({
      ...prev,
      unit,
      inclination: Number(converted.toFixed(6)),
    }));
  };

  const addScreenshot = () => {
    if (!newScreenshot.description.trim() && !newScreenshot.url.trim()) return;
    const url = newScreenshot.url.trim() || imgPrompt(newScreenshot.description || 'astronomy visualization');
    const sc: Screenshot = {
      id: `temp-${Date.now()}`,
      url,
      description: newScreenshot.description,
      timestamp: new Date().toISOString(),
      judgment: newScreenshot.judgment || undefined,
    };
    setForm((prev) => ({ ...prev, screenshots: [...prev.screenshots, sc] }));
    setNewScreenshot({ description: '', judgment: '', url: '' });
    setShowAddScreenshot(false);
  };

  const removeScreenshot = (scId: string) => {
    setForm((prev) => ({ ...prev, screenshots: prev.screenshots.filter((s) => s.id !== scId) }));
  };

  const handleSubmit = () => {
    const reason = changeReason.trim() || (isNew ? '新建沙盘' : '未说明修改原因');

    if (isNew) {
      const created = createSandbox(form, reason);
      navigate(`/sandbox/${created.id}`);
    } else if (id) {
      const updated = updateSandbox(id, form, reason, modifiedBy);
      if (updated) navigate(`/sandbox/${id}`);
    }
  };

  const convertedDegree = form.unit === 'radian'
    ? convertInclination(form.inclination, 'radian', 'degree')
    : form.inclination;
  const hasUnitWarning = form.unit === 'radian' && form.inclination > 6.28;
  const hasCameraWarning = Math.abs(form.cameraView.x) > 100 || form.cameraView.zoom < 0.1 || form.cameraView.zoom > 5;

  if (!isNew && !existing) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <SandboxBreadcrumb extra={[{ label: '修正' }]} />
        <div className="card p-16 text-center">沙盘不存在</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <SandboxBreadcrumb extra={[{ label: isNew ? '新建' : '修正' }]} />

      <PageHeader
        title={isNew ? '新建沙盘' : `修正：${existing?.name}`}
        description={isNew ? '创建一个新的轨道倾角沙盘演示项目' : '修改沙盘参数，系统将记录完整变更历史'}
        actions={
          <>
            <Link
              to={isNew ? '/' : `/sandbox/${id}`}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              取消
            </Link>
            <button
              onClick={handleSubmit}
              disabled={!form.name.trim()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isNew ? '创建并记录' : '保存变更'}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="section-title">
              <FileText className="w-5 h-5 text-gold-400" />
              基本信息
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">沙盘名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="例如：地球黄道倾角演示"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value as SandboxStatus)}
                    className="input-field"
                  >
                    <option value="draft">草稿</option>
                    <option value="reviewing">复核中</option>
                    <option value="confirmed">已确认</option>
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.modelOverlap}
                      onChange={(e) => updateField('modelOverlap', e.target.checked)}
                      className="w-4 h-4 accent-gold-500"
                    />
                    存在模型重叠
                  </label>
                  <div className="text-xs text-space-400 mt-1">标记后会在列表和详情中显示异常警告</div>
                </div>
              </div>
              <div>
                <label className="label">备注</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="补充说明、问题记录、注意事项..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">
                <ImageIcon className="w-5 h-5 text-gold-400" />
                截图清单 ({form.screenshots.length})
              </h3>
              <button
                onClick={() => setShowAddScreenshot(true)}
                className="btn-ghost inline-flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                添加截图
              </button>
            </div>

            {showAddScreenshot && (
              <div className="bg-space-900/60 border border-space-600/60 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="截图描述"
                    value={newScreenshot.description}
                    onChange={(e) => setNewScreenshot((p) => ({ ...p, description: e.target.value }))}
                    className="input-field text-sm col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="截图判断/结论（可选）"
                    value={newScreenshot.judgment}
                    onChange={(e) => setNewScreenshot((p) => ({ ...p, judgment: e.target.value }))}
                    className="input-field text-sm col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="图片URL（留空则自动生成）"
                    value={newScreenshot.url}
                    onChange={(e) => setNewScreenshot((p) => ({ ...p, url: e.target.value }))}
                    className="input-field text-sm col-span-2"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddScreenshot(false)} className="btn-ghost text-sm">
                    取消
                  </button>
                  <button onClick={addScreenshot} className="btn-primary text-sm">
                    添加
                  </button>
                </div>
              </div>
            )}

            {form.screenshots.length === 0 ? (
              <div className="text-center py-8 text-space-400 border border-dashed border-space-600/60 rounded-lg text-sm">
                暂无截图，点击上方"添加截图"按钮
              </div>
            ) : (
              <div className="space-y-3">
                {form.screenshots.map((sc, idx) => (
                  <div key={sc.id} className="flex gap-3 p-3 bg-space-900/40 rounded-lg border border-space-700/40">
                    <div className="w-28 h-20 flex-shrink-0 bg-space-800 rounded overflow-hidden">
                      <img src={sc.url} alt={sc.description} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-space-100">#{idx + 1} {sc.description || '（无描述）'}</div>
                      {sc.judgment && (
                        <div className="text-xs text-amber-300 mt-1">判断：{sc.judgment}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeScreenshot(sc.id)}
                      className="p-2 text-space-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="section-title">
              <Ruler className="w-5 h-5 text-gold-400" />
              轨道倾角
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">数值</label>
                <input
                  type="number"
                  step="any"
                  value={form.inclination}
                  onChange={(e) => updateField('inclination', Number(e.target.value))}
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="label">单位</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['degree', 'radian'] as UnitType[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => handleUnitToggle(u)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        form.unit === u
                          ? 'bg-gold-500 text-space-900'
                          : 'bg-space-700/60 text-space-200 hover:bg-space-700'
                      }`}
                    >
                      {getUnitText(u)}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-space-400 mt-2">切换单位时数值将自动换算</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-space-900/40 rounded px-2.5 py-2">
                  <div className="text-space-400 mb-0.5">度 (°)</div>
                  <div className={`font-mono ${hasUnitWarning ? 'text-amber-400' : 'text-space-100'}`}>
                    {convertedDegree.toFixed(2)}°
                  </div>
                </div>
                <div className="bg-space-900/40 rounded px-2.5 py-2">
                  <div className="text-space-400 mb-0.5">弧度 (rad)</div>
                  <div className="font-mono text-space-100">
                    {form.unit === 'radian' ? form.inclination.toFixed(4) : convertInclination(form.inclination, 'degree', 'radian').toFixed(4)}
                  </div>
                </div>
              </div>
              {hasUnitWarning && (
                <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-700/50 rounded px-2.5 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>弧度合理范围约 0~2π（6.28），当前值偏大，可能存在单位混淆</span>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-title">
              <Camera className="w-5 h-5 text-gold-400" />
              视角参数
            </h3>
            <div className="space-y-3">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis}>
                  <label className="label uppercase font-mono">{axis} 坐标</label>
                  <input
                    type="number"
                    step="any"
                    value={form.cameraView[axis]}
                    onChange={(e) => updateCamera(axis, Number(e.target.value))}
                    className={`input-field font-mono text-sm ${Math.abs(form.cameraView[axis]) > 100 ? 'border-amber-600/60' : ''}`}
                  />
                </div>
              ))}
              <div>
                <label className="label uppercase font-mono">缩放 (zoom)</label>
                <input
                  type="number"
                  step="any"
                  value={form.cameraView.zoom}
                  onChange={(e) => updateCamera('zoom', Number(e.target.value))}
                  className={`input-field font-mono text-sm ${form.cameraView.zoom < 0.1 || form.cameraView.zoom > 5 ? 'border-amber-600/60' : ''}`}
                />
              </div>
              {hasCameraWarning && (
                <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-700/50 rounded px-2.5 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>视角参数处于极端范围，实际画面可能不可见</span>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5 border-gold-500/30 bg-gold-500/5">
            <h3 className="section-title">
              <User className="w-5 h-5 text-gold-400" />
              变更记录
            </h3>
            <div className="space-y-4">
              {!isNew && (
                <div>
                  <label className="label">操作人</label>
                  <input
                    type="text"
                    value={modifiedBy}
                    onChange={(e) => setModifiedBy(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
              )}
              <div>
                <label className="label">
                  {isNew ? '创建说明' : '修改原因 *'}
                </label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder={isNew
                    ? '描述此沙盘的用途、数据来源...'
                    : '详细说明为何修改，例如：发现单位混淆、修正视角重叠、更新截图结论...'
                  }
                  rows={4}
                  className="input-field resize-none text-sm"
                />
              </div>
              <div className="text-xs text-space-400">
                提交后，此记录将作为 v{isNew ? '1' : (existing ? (useSandboxStore.getState().getSandboxHistory(id!).length + 1) : '?')} 版本永久保存，包含完整的变更前后对比。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
