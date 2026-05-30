import { useAppStore } from '../store/appStore';
import { Eye, EyeOff } from 'lucide-react';

export default function SectionFilter() {
  const { sections, activeSections, toggleSection } = useAppStore();

  return (
    <div className="p-4 bg-[#0d1f35] rounded-lg border border-[#3A4A5C]">
      <h3 className="text-sm font-semibold text-[#F5F0E8] mb-3 font-['DM_Sans']">声部筛选</h3>

      <div className="space-y-2">
        {sections.map((section) => {
          const isActive = activeSections.has(section.id);

          return (
            <button
              key={section.id}
              onClick={() => toggleSection(section.id)}
              className={`w-full flex items-center justify-between p-2 rounded transition-all ${
                isActive
                  ? 'bg-[#1a2d4a] border border-[#D4A843]'
                  : 'bg-transparent border border-[#3A4A5C] opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
                <span className={`text-sm ${isActive ? 'text-[#F5F0E8]' : 'text-gray-400'}`}>
                  {section.name}
                </span>
              </div>
              {isActive ? (
                <Eye size={14} className="text-[#D4A843]" />
              ) : (
                <EyeOff size={14} className="text-gray-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
