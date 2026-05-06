import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AgentRunService } from './agent-run.service';
import { AgentOrchestratorInput, AgentOrchestratorOutput, AgentRunSummary } from './agent.types';
import { IntakeAgent } from './services/intake.agent';
import { RecommendationAgent } from './services/recommendation.agent';
import { RegulatoryContextAgent } from './services/regulatory-context.agent';
import { RiskAnalysisAgent } from './services/risk-analysis.agent';
import { ValidatorAgent } from './services/validator.agent';

@Injectable()
export class AgentOrchestratorService {
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly intakeAgent: IntakeAgent,
    private readonly regulatoryContextAgent: RegulatoryContextAgent,
    private readonly riskAnalysisAgent: RiskAnalysisAgent,
    private readonly recommendationAgent: RecommendationAgent,
    private readonly validatorAgent: ValidatorAgent,
    private readonly agentRunService: AgentRunService,
  ) {}

  async run(input: AgentOrchestratorInput): Promise<AgentOrchestratorOutput> {
    const analysisId = uuidv4();
    const runs: AgentRunSummary[] = [];

    try {
      const intakeResult = await this.intakeAgent.run({
        textRedacted: input.textRedacted,
        scenario: input.scenario,
        entity: input.entity,
        language: input.language,
      });
      runs.push(intakeResult.run);

      const regulatoryResult = await this.regulatoryContextAgent.run({
        textRedacted: input.textRedacted,
        caseType: intakeResult.data.caseType,
        entity: input.entity,
        topK: 5,
      });
      runs.push(regulatoryResult.run);

      const riskResult = await this.riskAnalysisAgent.run({
        textRedacted: input.textRedacted,
        caseType: intakeResult.data.caseType,
        entity: input.entity,
        chunks: regulatoryResult.data.chunks,
      });
      runs.push(riskResult.run);

      const recommendationResult = await this.recommendationAgent.run({
        textRedacted: input.textRedacted,
        caseType: intakeResult.data.caseType,
        entity: input.entity,
        pillars: riskResult.data.pillars,
      });
      runs.push(recommendationResult.run);

      const validatorResult = await this.validatorAgent.run({
        chunks: regulatoryResult.data.chunks,
        pillars: riskResult.data.pillars,
      });
      runs.push(validatorResult.run);

      await this.agentRunService.createMany(analysisId, runs);

      return {
        caseType: intakeResult.data.caseType,
        entities: intakeResult.data.entities,
        language: intakeResult.data.language,
        riskScore: riskResult.data.riskScore,
        riskLabel: riskResult.data.riskLabel,
        resultTitle: riskResult.data.resultTitle,
        resultText: riskResult.data.resultText,
        pillars: validatorResult.data.pillars,
        plan: recommendationResult.data.plan,
        letters: recommendationResult.data.letters,
        runs,
      };
    } catch (error) {
      this.logger.error(`Orchestration failed: ${(error as Error).message}`);
      await this.agentRunService.createMany(analysisId, runs);
      throw error;
    }
  }
}
