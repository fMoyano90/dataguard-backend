import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsModule } from '../agents/agents.module';
import { AgentRun, AgentRunSchema } from '../agents/schemas/agent-run.schema';
import { AuditModule } from '../audit/audit.module';
import { PiiModule } from '../pii/pii.module';
import { ReportsModule } from '../reports/reports.module';
import { AnalysesController } from './analyses.controller';
import { AnalysesService } from './analyses.service';
import { Analysis, AnalysisSchema } from './schemas/analysis.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Analysis.name, schema: AnalysisSchema },
      { name: AgentRun.name, schema: AgentRunSchema },
    ]),
    AuditModule,
    AgentsModule,
    PiiModule,
    ReportsModule,
  ],
  controllers: [AnalysesController],
  providers: [AnalysesService],
  exports: [AnalysesService],
})
export class AnalysesModule {}
