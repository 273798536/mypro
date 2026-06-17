import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateMaterialDto, ActivateMaterialDto, MaterialResponseDto, VersionDiffDto, VersionComparisonDto } from './material.dto';

@Injectable()
export class MaterialService {
  private materials: Map<string, any[]> = new Map();
  private versionHistories: Map<string, any[]> = new Map();
  private idCounter = 1;

  async findAll(): Promise<MaterialResponseDto[]> {
    const allMaterials: any[] = [];
    for (const materials of this.materials.values()) {
      allMaterials.push(...materials);
    }
    return allMaterials.map(this.toResponseDto);
  }

  async findByTrackId(trackId: string): Promise<MaterialResponseDto[]> {
    const materials = this.materials.get(trackId) || [];
    return materials.map(this.toResponseDto);
  }

  async create(createMaterialDto: CreateMaterialDto): Promise<MaterialResponseDto> {
    const { trackId, overrideReason, ...materialData } = createMaterialDto;
    const existingMaterials = this.materials.get(trackId) || [];
    
    const nextVersion = existingMaterials.length > 0 
      ? Math.max(...existingMaterials.map(m => m.version)) + 1 
      : 1;

    const hasActiveVersion = existingMaterials.some(m => m.isActive);
    let previousActive: any = null;

    if (hasActiveVersion && !overrideReason) {
      throw new BadRequestException(
        `该曲目已有活跃版本，如需覆盖请提供覆盖原因`
      );
    }

    const newMaterial = {
      id: `material-${this.idCounter++}`,
      trackId,
      version: nextVersion,
      isActive: true,
      matchStatus: 'none',
      matchConfidence: 0,
      submittedAt: new Date(),
      ...materialData,
    };

    let updatedMaterials = [...existingMaterials];

    if (hasActiveVersion) {
      previousActive = existingMaterials.find(m => m.isActive);
      if (previousActive) {
        this.recordVersionHistory(previousActive.id, previousActive, newMaterial, 'override', overrideReason!);
        updatedMaterials = existingMaterials.map(m => 
          m.id === previousActive.id ? { ...m, isActive: false } : m
        );
      }
    }

    this.materials.set(trackId, [...updatedMaterials, newMaterial]);

    if (!hasActiveVersion) {
      this.recordVersionHistory(newMaterial.id, null, newMaterial, 'create', '初始版本创建');
    }

    return this.toResponseDto(newMaterial);
  }

  async activate(materialId: string, activateDto: ActivateMaterialDto): Promise<MaterialResponseDto> {
    let targetMaterial: any = null;
    let trackId: string | null = null;

    for (const [tid, materials] of this.materials.entries()) {
      const found = materials.find(m => m.id === materialId);
      if (found) {
        targetMaterial = found;
        trackId = tid;
        break;
      }
    }

    if (!targetMaterial || !trackId) {
      throw new NotFoundException(`材料 ${materialId} 不存在`);
    }

    if (targetMaterial.isActive) {
      throw new BadRequestException('该版本已经是活跃版本');
    }

    const materials = this.materials.get(trackId)!;
    const currentActive = materials.find(m => m.isActive);

    if (currentActive) {
      currentActive.isActive = false;
      this.recordVersionHistory(currentActive.id, currentActive, targetMaterial, 'override', activateDto.reason);
    }

    targetMaterial.isActive = true;

    this.materials.set(trackId, materials.map(m => 
      m.id === currentActive?.id ? { ...currentActive, isActive: false } : m
    ).map(m => 
      m.id === targetMaterial.id ? { ...targetMaterial, isActive: true } : m
    ));

    return this.toResponseDto(targetMaterial);
  }

  async getVersionComparison(materialId: string): Promise<VersionComparisonDto> {
    let targetMaterial: any = null;
    let trackId: string | null = null;

    for (const [tid, materials] of this.materials.entries()) {
      const found = materials.find(m => m.id === materialId);
      if (found) {
        targetMaterial = found;
        trackId = tid;
        break;
      }
    }

    if (!targetMaterial || !trackId) {
      throw new NotFoundException(`材料 ${materialId} 不存在`);
    }

    const allVersions = this.materials.get(trackId)!
      .filter(m => m.trackId === targetMaterial.trackId)
      .sort((a, b) => b.version - a.version);

    const versions = allVersions.map(m => ({
      version: m.version,
      material: this.toResponseDto(m),
      submittedAt: m.submittedAt,
      submittedBy: m.submittedBy,
    }));

    const diffs: VersionDiffDto[] = [];
    
    if (allVersions.length >= 2) {
      const newest = allVersions[0];
      const previous = allVersions[1];
      diffs.push(...this.calculateDiff(previous, newest, 'update'));
    }

    return {
      materialId,
      versions,
      diffs,
    };
  }

  private calculateDiff(oldMaterial: any, newMaterial: any, changeType: 'create' | 'update' | 'override'): VersionDiffDto[] {
    const diffs: VersionDiffDto[] = [];
    const fieldsToCompare = [
      'fileName', 'parsedTrackNo', 'parsedTitle', 'duration', 
      'timecode', 'timecodeDeviation', 'sourceBatch'
    ];

    for (const field of fieldsToCompare) {
      const oldValue = oldMaterial ? oldMaterial[field] ?? null : null;
      const newValue = newMaterial[field] ?? null;
      
      if (oldValue !== newValue) {
        diffs.push({
          fieldName: field,
          oldValue,
          newValue,
          changeType,
        });
      }
    }

    return diffs;
  }

  private recordVersionHistory(
    materialId: string,
    oldMaterial: any,
    newMaterial: any,
    changeType: 'create' | 'update' | 'override',
    reason: string
  ): void {
    const diffs = this.calculateDiff(oldMaterial, newMaterial, changeType);
    const histories = this.versionHistories.get(materialId) || [];

    for (const diff of diffs) {
      histories.push({
        id: `vh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        materialId,
        fieldName: diff.fieldName,
        oldValue: diff.oldValue ? String(diff.oldValue) : null,
        newValue: diff.newValue ? String(diff.newValue) : null,
        changedBy: newMaterial.submittedBy,
        changedAt: new Date(),
        changeType,
        reason,
      });
    }

    this.versionHistories.set(materialId, histories);
  }

  private toResponseDto(material: any): MaterialResponseDto {
    return {
      id: material.id,
      trackId: material.trackId,
      fileId: material.fileId,
      fileName: material.fileName,
      parsedTrackNo: material.parsedTrackNo,
      parsedTitle: material.parsedTitle,
      duration: material.duration,
      timecode: material.timecode,
      timecodeDeviation: material.timecodeDeviation,
      version: material.version,
      isActive: material.isActive,
      matchStatus: material.matchStatus,
      matchConfidence: material.matchConfidence,
      submittedBy: material.submittedBy,
      submittedAt: material.submittedAt,
      sourceBatch: material.sourceBatch,
    };
  }
}
