import { useRef, RefObject } from 'react';
import TerrainScene, { TerrainSceneHandle } from '../terrain/TerrainScene';
import { AppToolbar } from './AppToolbar';

export function AppMain() {
  const terrainRef = useRef<TerrainSceneHandle>(null);

  return (
    <main className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#0a1628] to-[#1a2a4a]">
      <TerrainScene ref={terrainRef} />
      <AppToolbar terrainRef={terrainRef} />
    </main>
  );
}