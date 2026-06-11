import { useState } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import { useScheduleStore } from '@/store';
import { SKILLS } from '@/types';
import { cn } from '@/lib/utils';
import { generateId } from '@/utils/mockData';
import type { Volunteer } from '@/types';

const avatarColors = [
  '#6366F1', '#F97316', '#10B981', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F59E0B', '#64748B'
];

const emptyVolunteer: Omit<Volunteer, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  avatar: avatarColors[0],
  phone: '',
  skills: [],
  mealBreak: {
    enabled: true,
    startTime: '12:00',
    endTime: '13:00'
  },
  hasCredential: false,
  credentialType: '',
  status: 'active',
  notes: ''
};

export default function Volunteers() {
  const volunteers = useScheduleStore((state) => state.volunteers);
  const addVolunteer = useScheduleStore((state) => state.addVolunteer);
  const updateVolunteer = useScheduleStore((state) => state.updateVolunteer);
  const removeVolunteer = useScheduleStore((state) => state.removeVolunteer);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [formData, setFormData] = useState(emptyVolunteer);

  const filteredVolunteers = volunteers.filter(v => {
    const matchSearch = v.name.includes(searchQuery) || v.phone.includes(searchQuery);
    const matchSkill = !filterSkill || v.skills.includes(filterSkill);
    const matchStatus = !filterStatus || v.status === filterStatus;
    return matchSearch && matchSkill && matchStatus;
  });

  const allSkills = [...new Set(volunteers.flatMap(v => v.skills))];

  const handleAdd = () => {
    setEditingVolunteer(null);
    setFormData({
      ...emptyVolunteer,
      avatar: avatarColors[Math.floor(Math.random() * avatarColors.length)]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      name: volunteer.name,
      avatar: volunteer.avatar,
      phone: volunteer.phone,
      skills: [...volunteer.skills],
      mealBreak: { ...volunteer.mealBreak },
      hasCredential: volunteer.hasCredential,
      credentialType: volunteer.credentialType || '',
      status: volunteer.status,
      notes: volunteer.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingVolunteer) {
      updateVolunteer(editingVolunteer.id, formData);
    } else {
      const newVolunteer: Volunteer = {
        ...formData,
        id: `vol-${generateId()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addVolunteer(newVolunteer);
    }

    setIsModalOpen(false);
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">志愿者管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理志愿者信息、技能和证件状态</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          添加志愿者
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索志愿者姓名、电话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">全部技能</option>
            {allSkills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">全部状态</option>
            <option value="active">在岗</option>
            <option value="inactive">停用</option>
            <option value="onLeave">请假</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">志愿者</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">技能标签</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">餐休时间</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">证件状态</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredVolunteers.map((volunteer) => (
              <tr key={volunteer.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                      style={{ backgroundColor: volunteer.avatar }}
                    >
                      {volunteer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{volunteer.name}</p>
                      <p className="text-sm text-slate-500">{volunteer.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {volunteer.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {volunteer.mealBreak.enabled ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {volunteer.mealBreak.startTime} - {volunteer.mealBreak.endTime}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">未设置</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {volunteer.hasCredential ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600">{volunteer.credentialType || '已领取'}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">未领取</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-lg',
                    volunteer.status === 'active' && 'bg-emerald-50 text-emerald-600',
                    volunteer.status === 'inactive' && 'bg-slate-100 text-slate-600',
                    volunteer.status === 'onLeave' && 'bg-orange-50 text-orange-600'
                  )}>
                    {volunteer.status === 'active' ? '在岗' : volunteer.status === 'inactive' ? '停用' : '请假'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(volunteer)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeVolunteer(volunteer.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>共 {filteredVolunteers.length} 名志愿者</span>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">上一页</button>
          <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-medium">1</span>
          <button className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">下一页</button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingVolunteer ? '编辑志愿者' : '添加志愿者'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">姓名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入志愿者姓名"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">联系电话</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入联系电话"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">头像颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {avatarColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, avatar: color })}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        formData.avatar === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">技能标签</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                        formData.skills.includes(skill)
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Volunteer['status'] })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="active">在岗</option>
                  <option value="inactive">停用</option>
                  <option value="onLeave">请假</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="mealBreakEnabled"
                  checked={formData.mealBreak.enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    mealBreak: { ...formData.mealBreak, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="mealBreakEnabled" className="text-sm font-medium text-slate-700">
                  设置餐休时间
                </label>
              </div>

              {formData.mealBreak.enabled && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">开始时间</label>
                    <input
                      type="time"
                      value={formData.mealBreak.startTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        mealBreak: { ...formData.mealBreak, startTime: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">结束时间</label>
                    <input
                      type="time"
                      value={formData.mealBreak.endTime}
                      onChange={(e) => setFormData({
                        ...formData,
                        mealBreak: { ...formData.mealBreak, endTime: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasCredential"
                  checked={formData.hasCredential}
                  onChange={(e) => setFormData({ ...formData, hasCredential: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="hasCredential" className="text-sm font-medium text-slate-700">
                  已领取工作证件
                </label>
              </div>

              {formData.hasCredential && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">证件类型</label>
                  <input
                    type="text"
                    value={formData.credentialType}
                    onChange={(e) => setFormData({ ...formData, credentialType: e.target.value })}
                    placeholder="请输入证件类型"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="可选备注信息"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                {editingVolunteer ? '保存修改' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
