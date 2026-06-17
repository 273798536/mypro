import { Injectable, NotFoundException } from '@nestjs/common';
import { TourDto, TourStatsDto, GetToursQueryDto, CreateTourDto, UpdateTourDto } from './tour.dto';

@Injectable()
export class TourService {
  private tours: TourDto[] = [
    {
      id: '1',
      name: '2026周杰伦嘉年华世界巡回演唱会',
      description: '2026年度全球巡回演唱会',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-31'),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: '2',
      name: '2026五月天人生无限公司巡回演唱会',
      description: '五月天年度巡回演唱会',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-09-30'),
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-15'),
    },
  ];

  async findAll(query: GetToursQueryDto): Promise<{ data: TourDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, keyword } = query;
    
    let filteredTours = [...this.tours];
    
    if (keyword) {
      filteredTours = filteredTours.filter(
        (tour) =>
          tour.name.toLowerCase().includes(keyword.toLowerCase()) ||
          tour.description?.toLowerCase().includes(keyword.toLowerCase()),
      );
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTours = filteredTours.slice(startIndex, endIndex);
    
    return {
      data: paginatedTours,
      total: filteredTours.length,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<TourDto> {
    const tour = this.tours.find((t) => t.id === id);
    if (!tour) {
      throw new NotFoundException(`巡演ID ${id} 不存在`);
    }
    return tour;
  }

  async getStats(id: string): Promise<TourStatsDto> {
    const tour = await this.findOne(id);
    
    return {
      tourId: tour.id,
      tourName: tour.name,
      totalShows: 5,
      totalTracks: 25,
      pendingTracks: 12,
      processingTracks: 5,
      completedTracks: 8,
      suspendedTracks: 0,
      materialsPending: 3,
      totalMaterials: 22,
      progressPercentage: 32,
    };
  }

  async create(createTourDto: CreateTourDto): Promise<TourDto> {
    const newTour: TourDto = {
      id: String(this.tours.length + 1),
      name: createTourDto.name,
      description: createTourDto.description,
      startDate: new Date(createTourDto.startDate),
      endDate: new Date(createTourDto.endDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.tours.push(newTour);
    return newTour;
  }

  async update(id: string, updateTourDto: UpdateTourDto): Promise<TourDto> {
    const tourIndex = this.tours.findIndex((t) => t.id === id);
    if (tourIndex === -1) {
      throw new NotFoundException(`巡演ID ${id} 不存在`);
    }
    
    const updatedTour = {
      ...this.tours[tourIndex],
      ...updateTourDto,
      startDate: updateTourDto.startDate ? new Date(updateTourDto.startDate) : this.tours[tourIndex].startDate,
      endDate: updateTourDto.endDate ? new Date(updateTourDto.endDate) : this.tours[tourIndex].endDate,
      updatedAt: new Date(),
    };
    
    this.tours[tourIndex] = updatedTour;
    return updatedTour;
  }

  async remove(id: string): Promise<void> {
    const tourIndex = this.tours.findIndex((t) => t.id === id);
    if (tourIndex === -1) {
      throw new NotFoundException(`巡演ID ${id} 不存在`);
    }
    
    this.tours.splice(tourIndex, 1);
  }
}
