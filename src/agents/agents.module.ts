import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClaudeModule } from '../claude/claude.module';
import { RagModule } from '../rag/rag.module';
import { ToolsModule } from '../tools/tools.module';
import { AgentRunService } from './agent-run.service';
import { AgentOrchestratorService } from './agent-orchestrator.service';
import { AgentRun, AgentRunSchema } from './schemas/agent-run.schema';
import { IntakeAgent } from './services/intake.agent';
import { RegulatoryContextAgent } from './services/regulatory-context.agent';
import { RecommendationAgent } from './services/recommendation.agent';
import { RiskAnalysisAgent } from './services/risk-analysis.agent';
import { ValidatorAgent } from './services/validator.agent';

@Module({
  imports: [
    ClaudeModule,
    RagModule,
    ToolsModule,
    MongooseModule.forFeature([{ name: AgentRun.name, schema: AgentRunSchema }]),
  ],
  providers: [AgentRunService, AgentOrchestratorService, IntakeAgent, RegulatoryContextAgent, RiskAnalysisAgent, RecommendationAgent, ValidatorAgent],
  exports: [AgentRunService, AgentOrchestratorService, IntakeAgent, RegulatoryContextAgent, RiskAnalysisAgent, RecommendationAgent, ValidatorAgent],
})
export class AgentsModule {}
