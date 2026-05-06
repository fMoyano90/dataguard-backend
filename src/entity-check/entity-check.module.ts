import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ToolsModule } from '../tools/tools.module';
import { EntityCheckController } from './entity-check.controller';
import { EntityCheckService } from './entity-check.service';

@Module({
  imports: [AuditModule, ToolsModule],
  controllers: [EntityCheckController],
  providers: [EntityCheckService],
  exports: [EntityCheckService],
})
export class EntityCheckModule {}
