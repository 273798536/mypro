import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRepairOrderDto {
  @IsString()
  orderNo: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  productModel?: string;

  @IsOptional()
  @IsString()
  faultDescription?: string;

  @IsOptional()
  repairDate?: Date;

  @IsOptional()
  @IsString()
  engineerName?: string;

  @IsOptional()
  @IsString()
  rawContent?: string;
}

export class CreateSparePartScanDto {
  @IsString()
  scanNo: string;

  @IsString()
  partCode: string;

  @IsString()
  partName: string;

  quantity: number;

  unitPrice: number;

  totalAmount: number;

  @IsOptional()
  @IsString()
  partType?: string;

  @IsOptional()
  scanTime?: Date;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @IsString()
  rawContent?: string;
}

export class CreateCustomerSignPhotoDto {
  @IsString()
  photoNo: string;

  @IsString()
  fileName: string;

  @IsString()
  filePath: string;

  @IsOptional()
  fileSize?: number;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  signTime?: Date;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  rawContent?: string;
}

export class CreateScanDetailDto {
  @IsString()
  detailNo: string;

  @IsString()
  barcode: string;

  @IsOptional()
  @IsString()
  partCode?: string;

  @IsOptional()
  @IsString()
  partName?: string;

  @IsOptional()
  quantity?: number;

  @IsOptional()
  unitPrice?: number;

  @IsOptional()
  totalAmount?: number;

  @IsOptional()
  @IsString()
  partType?: string;

  @IsOptional()
  scanTime?: Date;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  rawContent?: string;
}

export class CreateBatchDto {
  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRepairOrderDto)
  repairOrders?: CreateRepairOrderDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSparePartScanDto)
  sparePartScans?: CreateSparePartScanDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerSignPhotoDto)
  customerSignPhotos?: CreateCustomerSignPhotoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScanDetailDto)
  scanDetails?: CreateScanDetailDto[];
}
