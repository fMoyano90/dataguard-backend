import { Body, Controller, Post } from '@nestjs/common';
import { RagService } from './rag.service';
import { IngestDto } from './dto/ingest.dto';
import { QueryDto } from './dto/query.dto';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ingest')
  ingest(@Body() dto: IngestDto) {
    return this.ragService.ingest(dto);
  }

  @Post('query')
  query(@Body() dto: QueryDto) {
    return this.ragService.query(dto);
  }
}
