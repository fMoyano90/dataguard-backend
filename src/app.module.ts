import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { RagModule } from './rag/rag.module';
import { ClaudeModule } from './claude/claude.module';
import { PiiModule } from './pii/pii.module';
import { AuditModule } from './audit/audit.module';
import { ToolsModule } from './tools/tools.module';
import { EntityCheckModule } from './entity-check/entity-check.module';
import { HealthModule } from './health/health.module';
import { AgentsModule } from './agents/agents.module';
import { AnalysesModule } from './analyses/analyses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
      }),
    }),
    ClaudeModule,
    PiiModule,
    AuditModule,
    RagModule,
    ToolsModule,
    EntityCheckModule,
    HealthModule,
    AgentsModule,
    AnalysesModule,
  ],
})
export class AppModule {}
