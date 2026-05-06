import { IsString, IsOptional, IsObject } from 'class-validator';

export class IngestDto {
  @IsString()
  text: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;

  @IsString()
  @IsOptional()
  namespace?: string;
}
