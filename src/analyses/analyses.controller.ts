import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalysisResultDto } from './dto/analysis-result.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { ExtractDocumentResultDto } from './dto/extract-document-result.dto';
import { AnalysesService } from './analyses.service';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIMETYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

@Controller('analyses')
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post()
  run(@Body() dto: CreateAnalysisDto): Promise<AnalysisResultDto> {
    return this.analysesService.run(dto);
  }

  @Post('extract-document')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_BYTES },
    }),
  )
  async extractDocument(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_DOCUMENT_BYTES })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ): Promise<ExtractDocumentResultDto> {
    if (!ALLOWED_DOCUMENT_MIMETYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Tipo de archivo no soportado: ${file.mimetype}. Acepta PDF, PNG, JPG o WEBP.`,
      );
    }

    return this.analysesService.extractDocument(file);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<AnalysisResultDto> {
    return this.analysesService.findById(id);
  }
}
