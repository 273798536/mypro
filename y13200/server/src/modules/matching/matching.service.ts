import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { parseFileName, jaroWinkler, matchFileName, ParsedFileName, MatchResult } from './match.engine';
import {
  AnalyzeMatchingDto,
  ConfirmMatchingDto,
  BatchMatchingDto,
  MatchResultDto,
  BatchMatchResultDto,
  ConfirmResultDto,
  ParsedFileNameDto,
} from './matching.dto';

@Injectable()
export class MatchingService {
  private matchResults: Map<string, MatchResult> = new Map();
  private confirmedMatches: Map<string, ConfirmResultDto> = new Map();

  parseFileName(fileName: string): ParsedFileNameDto {
    return parseFileName(fileName);
  }

  jaroWinkler(s1: string, s2: string): number {
    return jaroWinkler(s1, s2);
  }

  async analyze(analyzeDto: AnalyzeMatchingDto): Promise<MatchResultDto> {
    const { materialId, fileName, actualDuration, candidates } = analyzeDto;
    
    const parsed = parseFileName(fileName);
    const result = matchFileName(materialId, parsed, candidates, actualDuration);
    
    this.matchResults.set(materialId, result);
    
    return {
      ...result,
      parsed,
    };
  }

  async confirm(confirmDto: ConfirmMatchingDto): Promise<ConfirmResultDto> {
    const { materialId, trackId, matchType, confidence, confirmedBy } = confirmDto;
    
    if (!this.matchResults.has(materialId)) {
      throw new NotFoundException(`材料 ${materialId} 未进行匹配分析`);
    }

    const confirmedResult: ConfirmResultDto = {
      materialId,
      trackId,
      matchStatus: matchType,
      matchConfidence: confidence,
      confirmedBy,
      confirmedAt: new Date(),
    };

    this.confirmedMatches.set(materialId, confirmedResult);
    
    return confirmedResult;
  }

  async batchMatch(batchDto: BatchMatchingDto): Promise<BatchMatchResultDto> {
    const { items, candidates } = batchDto;
    const results: MatchResultDto[] = [];

    for (const item of items) {
      const parsed = parseFileName(item.fileName);
      const result = matchFileName(item.materialId, parsed, candidates, item.actualDuration);
      
      this.matchResults.set(item.materialId, result);
      
      results.push({
        ...result,
        parsed,
      });
    }

    const summary = {
      total: results.length,
      autoMatched: results.filter(r => r.matchType === 'auto').length,
      suggested: results.filter(r => r.matchType === 'suggest').length,
      manualRequired: results.filter(r => r.matchType === 'manual').length,
      unmatched: results.filter(r => r.matchType === 'none').length,
    };

    return {
      results,
      summary,
    };
  }

  async getMatchResult(materialId: string): Promise<MatchResultDto> {
    const result = this.matchResults.get(materialId);
    if (!result) {
      throw new NotFoundException(`材料 ${materialId} 未进行匹配分析`);
    }
    return result;
  }

  async getConfirmedMatch(materialId: string): Promise<ConfirmResultDto> {
    const confirmed = this.confirmedMatches.get(materialId);
    if (!confirmed) {
      throw new NotFoundException(`材料 ${materialId} 未确认匹配`);
    }
    return confirmed;
  }
}
