import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MaterialService } from './material.service';
import { CreateMaterialDto, ActivateMaterialDto, MaterialResponseDto, VersionComparisonDto } from './material.dto';

@Controller()
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get('tracks/:id/materials')
  @HttpCode(HttpStatus.OK)
  async getMaterialsByTrackId(
    @Param('id') trackId: string,
  ): Promise<{ code: number; message: string; data: MaterialResponseDto[] }> {
    const materials = await this.materialService.findByTrackId(trackId);
    return {
      code: 0,
      message: 'success',
      data: materials,
    };
  }

  @Post('materials')
  @HttpCode(HttpStatus.CREATED)
  async createMaterial(
    @Body() createMaterialDto: CreateMaterialDto,
  ): Promise<{ code: number; message: string; data: MaterialResponseDto }> {
    const material = await this.materialService.create(createMaterialDto);
    return {
      code: 0,
      message: '材料创建成功',
      data: material,
    };
  }

  @Post('materials/:id/activate')
  @HttpCode(HttpStatus.OK)
  async activateMaterial(
    @Param('id') materialId: string,
    @Body() activateDto: ActivateMaterialDto,
  ): Promise<{ code: number; message: string; data: MaterialResponseDto }> {
    const material = await this.materialService.activate(materialId, activateDto);
    return {
      code: 0,
      message: '版本激活成功',
      data: material,
    };
  }

  @Get('materials/:id/versions')
  @HttpCode(HttpStatus.OK)
  async getMaterialVersions(
    @Param('id') materialId: string,
  ): Promise<{ code: number; message: string; data: VersionComparisonDto }> {
    const versionData = await this.materialService.getVersionComparison(materialId);
    return {
      code: 0,
      message: 'success',
      data: versionData,
    };
  }
}
