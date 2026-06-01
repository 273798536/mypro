import { Grid3X3 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

export function SkillMatrix() {
  const { getFilteredVolunteers, skills } = useStore();
  const volunteers = getFilteredVolunteers();

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300">
        <Grid3X3 className="h-4 w-4 text-brand-500" />
        技能矩阵
      </h3>

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-800 pb-2 pr-3 text-left font-medium text-gray-500">
                志愿者
              </th>
              {skills.map(skill => (
                <th
                  key={skill.id}
                  className="whitespace-nowrap px-2 py-1 text-center font-medium text-gray-500"
                  title={skill.name}
                >
                  <span className="inline-block max-w-[3.5rem] truncate">{skill.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {volunteers.map(vol => (
              <tr key={vol.id}>
                <td className="sticky left-0 z-10 bg-surface-800 py-1.5 pr-3 font-medium text-gray-300">
                  {vol.name}
                </td>
                {skills.map(skill => {
                  const has = vol.skillIds.includes(skill.id);
                  return (
                    <td key={skill.id} className="px-2 py-1.5 text-center">
                      <span
                        className={cn(
                          'inline-block h-6 w-6 rounded-sm leading-6',
                          has
                            ? 'bg-brand-500/30 text-brand-400'
                            : 'bg-surface-700 text-surface-700'
                        )}
                      >
                        {has ? '●' : '○'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
