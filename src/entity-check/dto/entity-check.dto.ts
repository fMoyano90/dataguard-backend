import { IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class EntityCheckDto {
  @ValidateIf((dto: EntityCheckDto) => !dto.url || dto.name !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ValidateIf((dto: EntityCheckDto) => !dto.name || dto.url !== undefined)
  @IsUrl({ require_protocol: true })
  @MaxLength(2_048)
  url?: string;
}
