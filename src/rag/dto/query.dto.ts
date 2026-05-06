import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class QueryDto {
  @IsString()
  query: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  topK?: number;

  @IsString()
  @IsOptional()
  namespace?: string;
}
