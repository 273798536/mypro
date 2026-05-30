import React from 'react';
import { VersionSwitcher } from './VersionSwitcher';
import { ConflictList } from './ConflictList';
import { MusicianEditor } from './MusicianEditor';

export const ControlPanel: React.FC = () => {
  return (
    <div className="w-80 bg-[#0f0f1a] border-l border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-[#16213e] to-[#0f0f1a]">
        <h1 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          舞台走位沙盘
        </h1>
        <p className="text-xs text-gray-400 mt-1">STAGE SANDBOX v1.0</p>
      </div>

      <VersionSwitcher />

      <ConflictList />

      <MusicianEditor />
    </div>
  );
};
