import { LEVELS } from '../data/levels';
import type { Level } from '../types/matrix';

interface LevelSelectorProps {
  onSelectLevel: (levelId: string) => void;
}

function getDifficultyColor(difficulty: Level['difficulty']): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'hard':
      return 'bg-red-100 text-red-800';
  }
}

function getDifficultyLabel(difficulty: Level['difficulty']): string {
  switch (difficulty) {
    case 'easy':
      return '入门';
    case 'medium':
      return '进阶';
    case 'hard':
      return '挑战';
  }
}

export default function LevelSelector({ onSelectLevel }: LevelSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {LEVELS.map((level, index) => (
        <div
          key={level.id}
          onClick={() => onSelectLevel(level.id)}
          className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl font-bold text-purple-600">
              {index + 1}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(level.difficulty)}`}>
              {getDifficultyLabel(level.difficulty)}
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {level.name}
          </h3>
          
          <p className="text-gray-600 mb-4 text-sm">
            {level.description}
          </p>
          
          <div className="flex items-center gap-2 text-purple-500 text-sm font-medium">
            <span>开始挑战</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
