import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Material } from '@/types';
import { calculateFileHash, generateId } from '@/utils/hash';

export function useMaterials() {
  const { materials, importMaterials, updateMaterialStatus, removeMaterial } = useAppStore();

  const getMaterialByHash = useCallback((hash: string): Material | undefined => {
    return materials.find(m => m.hash === hash);
  }, [materials]);

  const importFiles = useCallback(async (files: File[]): Promise<{ imported: Material[]; duplicates: Material[] }> => {
    const imported: Material[] = [];
    const duplicates: Material[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const hash = await calculateFileHash(file);
        const existing = getMaterialByHash(hash);

        if (existing) {
          duplicates.push(existing);
          continue;
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const material: Material = {
          id: generateId(),
          name: file.name,
          hash,
          dataUrl,
          importedAt: Date.now(),
          status: 'pending',
        };

        imported.push(material);
      } catch (error) {
        console.error('Failed to process file:', file.name, error);
      }
    }

    if (imported.length > 0) {
      importMaterials(imported);
    }

    return { imported, duplicates };
  }, [getMaterialByHash, importMaterials]);

  return {
    materials,
    importMaterials: importFiles,
    updateMaterialStatus,
    getMaterialByHash,
    removeMaterial,
  };
}
