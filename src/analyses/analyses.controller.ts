import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AnalysisResultDto } from './dto/analysis-result.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { AnalysesService } from './analyses.service';

@Controller('analyses')
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post()
  run(@Body() dto: CreateAnalysisDto): Promise<AnalysisResultDto> {
    return this.analysesService.run(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<AnalysisResultDto> {
    return this.analysesService.findById(id);
  }
}
