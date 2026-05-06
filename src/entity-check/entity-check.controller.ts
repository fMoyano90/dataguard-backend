import { Body, Controller, Post } from '@nestjs/common';
import { EntityCheckDto } from './dto/entity-check.dto';
import { EntityCheckResultDto } from './dto/entity-check-result.dto';
import { EntityCheckService } from './entity-check.service';

@Controller('entity-check')
export class EntityCheckController {
  constructor(private readonly entityCheckService: EntityCheckService) {}

  @Post()
  check(@Body() dto: EntityCheckDto): Promise<EntityCheckResultDto> {
    return this.entityCheckService.check(dto);
  }
}
