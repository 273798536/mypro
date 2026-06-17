import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  TrackDto,
  TrackStatus,
  GetTracksQueryDto,
  CreateTrackDto,
  UpdateTrackStatusDto,
  UpdateTrackDto,
} from './track.dto';

@Injectable()
export class TrackService {
  private tracks: TrackDto[] = [
    {
      id: '1',
      showId: '1',
      trackNo: 1,
      title: '夜曲',
      artist: '周杰伦',
      expectedDuration: 225,
      expectedTimecode: '00:03:45.000',
      status: 'suspended',
      currentVersion: 3,
      latestNote: '时码偏半拍，待现场老师确认',
      timecodeDeviation: 620,
      createdAt: new Date('2026-06-10'),
      updatedAt: new Date('2026-06-14'),
    },
    {
      id: '2',
      showId: '1',
      trackNo: 2,
      title: '七里香',
      artist: '周杰伦',
      expectedDuration: 298,
      expectedTimecode: '00:04:58.000',
      status: 'approved',
      currentVersion: 2,
      timecodeDeviation: 80,
      createdAt: new Date('2026-06-10'),
      updatedAt: new Date('2026-06-13'),
    },
    {
      id: '3',
      showId: '1',
      trackNo: 3,
      title: '青花瓷',
      artist: '周杰伦',
      expectedDuration: 245,
      expectedTimecode: '00:04:05.000',
      status: 'mismatch',
      currentVersion: 1,
      latestNote: '文件名不匹配（应为"03_青花瓷"）',
      createdAt: new Date('2026-06-10'),
      updatedAt: new Date('2026-06-12'),
    },
    {
      id: '4',
      showId: '1',
      trackNo: 4,
      title: '东风破',
      artist: '周杰伦',
      expectedDuration: 315,
      expectedTimecode: '00:05:15.000',
      status: 'pending',
      currentVersion: 0,
      latestNote: '缺少v2版本音频',
      createdAt: new Date('2026-06-10'),
      updatedAt: new Date('2026-06-11'),
    },
    {
      id: '5',
      showId: '1',
      trackNo: 5,
      title: '晴天',
      artist: '周杰伦',
      expectedDuration: 269,
      expectedTimecode: '00:04:29.000',
      status: 'reviewing',
      currentVersion: 2,
      timecodeDeviation: 150,
      createdAt: new Date('2026-06-10'),
      updatedAt: new Date('2026-06-14'),
    },
  ];

  async findAll(query: GetTracksQueryDto): Promise<{ data: TrackDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, showId, status, keyword } = query;

    let filteredTracks = [...this.tracks];

    if (showId) {
      filteredTracks = filteredTracks.filter((track) => track.showId === showId);
    }

    if (status) {
      filteredTracks = filteredTracks.filter((track) => track.status === status);
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredTracks = filteredTracks.filter(
        (track) =>
          track.title.toLowerCase().includes(lowerKeyword) ||
          track.artist.toLowerCase().includes(lowerKeyword) ||
          String(track.trackNo).includes(lowerKeyword),
      );
    }

    filteredTracks.sort((a, b) => a.trackNo - b.trackNo);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTracks = filteredTracks.slice(startIndex, endIndex);

    return {
      data: paginatedTracks,
      total: filteredTracks.length,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<TrackDto> {
    const track = this.tracks.find((t) => t.id === id);
    if (!track) {
      throw new NotFoundException(`曲目ID ${id} 不存在`);
    }
    return track;
  }

  async create(createTrackDto: CreateTrackDto): Promise<TrackDto> {
    const newTrack: TrackDto = {
      id: String(this.tracks.length + 1),
      showId: createTrackDto.showId,
      trackNo: createTrackDto.trackNo,
      title: createTrackDto.title,
      artist: createTrackDto.artist,
      expectedDuration: createTrackDto.expectedDuration,
      expectedTimecode: createTrackDto.expectedTimecode,
      status: 'pending',
      currentVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tracks.push(newTrack);
    return newTrack;
  }

  async update(id: string, updateTrackDto: UpdateTrackDto): Promise<TrackDto> {
    const trackIndex = this.tracks.findIndex((t) => t.id === id);
    if (trackIndex === -1) {
      throw new NotFoundException(`曲目ID ${id} 不存在`);
    }

    const updatedTrack = {
      ...this.tracks[trackIndex],
      ...updateTrackDto,
      updatedAt: new Date(),
    };

    this.tracks[trackIndex] = updatedTrack;
    return updatedTrack;
  }

  async updateStatus(id: string, updateTrackStatusDto: UpdateTrackStatusDto): Promise<TrackDto> {
    const trackIndex = this.tracks.findIndex((t) => t.id === id);
    if (trackIndex === -1) {
      throw new NotFoundException(`曲目ID ${id} 不存在`);
    }

    const currentTrack = this.tracks[trackIndex];
    const newStatus = updateTrackStatusDto.status;

    this.validateStatusTransition(currentTrack.status, newStatus);

    const updatedTrack = {
      ...currentTrack,
      status: newStatus,
      updatedAt: new Date(),
    };

    this.tracks[trackIndex] = updatedTrack;
    return updatedTrack;
  }

  async remove(id: string): Promise<void> {
    const trackIndex = this.tracks.findIndex((t) => t.id === id);
    if (trackIndex === -1) {
      throw new NotFoundException(`曲目ID ${id} 不存在`);
    }

    this.tracks.splice(trackIndex, 1);
  }

  private validateStatusTransition(currentStatus: TrackStatus, newStatus: TrackStatus): void {
    const validTransitions: Record<TrackStatus, TrackStatus[]> = {
      pending: ['matching', 'rejected'],
      matching: ['matched', 'mismatch', 'pending'],
      matched: ['reviewing', 'mismatch'],
      mismatch: ['matching', 'pending', 'rejected'],
      reviewing: ['approved', 'rejected', 'suspended'],
      suspended: ['approved', 'rejected', 'reviewing'],
      approved: ['reviewing'],
      rejected: ['pending', 'reviewing'],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `不允许从状态 "${currentStatus}" 转换到 "${newStatus}"`,
      );
    }
  }
}
