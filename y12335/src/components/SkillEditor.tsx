import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface SkillEditorProps {
  volunteerId: string;
}

export function SkillEditor({ volunteerId }: SkillEditorProps) {
  const volunteers = useStore(s => s.volunteers);
  const skills = useStore(s => s.skills);
  const updateVolunteerSkill = useStore(s => s.updateVolunteerSkill);
  const getSkillById = useStore(s => s.getSkillById);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const volunteer = volunteers.find(v => v.id === volunteerId);
  if (!volunteer) return null;

  const selectedSkillIds = volunteer.skillIds;
  const selectedSkills = selectedSkillIds
    .map(id => getSkillById(id))
    .filter(Boolean);

  const availableSkills = skills.filter(
    s => !selectedSkillIds.includes(s.id)
  );

  const categoryColors: Record<string, string> = {
    '服务': 'bg-brand-500/20 text-brand-400 border-brand-500/30',
    '安保': 'bg-red-500/20 text-red-400 border-red-500/30',
    '医疗': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    '语言': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    '技术': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    '宣传': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  const handleRemove = (skillId: string) => {
    const next = selectedSkillIds.filter(id => id !== skillId);
    updateVolunteerSkill(volunteerId, next);
  };

  const handleAdd = (skillId: string) => {
    const next = [...selectedSkillIds, skillId];
    updateVolunteerSkill(volunteerId, next);
    setDropdownOpen(false);
  };

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-100">
          {volunteer.name}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          ({selectedSkills.length} 项技能)
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {selectedSkills.map(skill => (
          <span
            key={skill!.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
              categoryColors[skill!.category] || 'bg-surface-700 text-gray-300 border-surface-600'
            }`}
          >
            {skill!.name}
            <button
              onClick={() => handleRemove(skill!.id)}
              className="hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {selectedSkills.length === 0 && (
          <span className="text-xs text-gray-500">暂无技能标签</span>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-400 transition-colors"
        >
          <ChevronDown size={14} className={dropdownOpen ? 'rotate-180' : ''} />
          添加技能
        </button>

        {dropdownOpen && availableSkills.length > 0 && (
          <div className="absolute z-10 mt-1 w-48 rounded-lg bg-surface-700 border border-surface-600 shadow-lg py-1 max-h-40 overflow-y-auto">
            {availableSkills.map(skill => (
              <button
                key={skill.id}
                onClick={() => handleAdd(skill.id)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-600 transition-colors ${
                  categoryColors[skill.category]?.split(' ')[1] || 'text-gray-300'
                }`}
              >
                <span className="text-gray-400 mr-1">[{skill.category}]</span>
                {skill.name}
              </button>
            ))}
          </div>
        )}

        {dropdownOpen && availableSkills.length === 0 && (
          <div className="absolute z-10 mt-1 w-48 rounded-lg bg-surface-700 border border-surface-600 shadow-lg py-2 px-3 text-xs text-gray-500">
            已选择所有可用技能
          </div>
        )}
      </div>
    </div>
  );
}
