import { Injectable } from '@nestjs/common';
import { AnalysisResultDto } from '../analyses/dto/analysis-result.dto';
import { CreateAnalysisDto } from '../analyses/dto/create-analysis.dto';
import { buildFixtureAnalysis } from '../analyses/fixtures/analysis.fixtures';

@Injectable()
export class ReportService {
  assembleFixture(input: CreateAnalysisDto, id: string, piiRedacted: boolean): AnalysisResultDto {
    return buildFixtureAnalysis(input, id, piiRedacted);
  }
}
