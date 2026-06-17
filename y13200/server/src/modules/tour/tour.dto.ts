import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';

export class TourDto {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TourStatsDto {
  tourId: string;
  tourName: string;
  totalShows: number;
  totalTracks: number;
  pendingTracks: number;
  processingTracks: number;
  completedTracks: number;
  suspendedTracks: number;
  materialsPending: number;
  totalMaterials: number;
  progressPercentage: number;
}

export class GetToursQueryDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateTourDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdateTourDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
