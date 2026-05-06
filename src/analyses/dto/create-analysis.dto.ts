import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SCENARIOS = ['credito_trampa', 'app_estafa', 'galpon', 'atd_software'] as const;
export const LANGUAGES = ['es', 'kreyol', 'quechua', 'en'] as const;
export const DOCUMENT_TYPES = ['contract', 'tos', 'rental', 'dpa'] as const;

export type Scenario = (typeof SCENARIOS)[number];
export type Language = (typeof LANGUAGES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class CreateAnalysisDto {
  @IsIn(SCENARIOS)
  scenario: Scenario;

  @IsString()
  @MinLength(20)
  @MaxLength(50_000)
  text: string;

  @IsIn(LANGUAGES)
  language: Language;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  entity: string;

  @IsIn(DOCUMENT_TYPES)
  documentType: DocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caseContext?: string;
}
