import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../claude/claude.service';
import { AgentResult, CaseType, IntakeAgentInput, IntakeAgentOutput } from '../agent.types';
import { INTAKE_SYSTEM_PROMPT } from '../prompts/intake.prompt';

const MODEL = 'claude-haiku-4-5';

@Injectable()
export class IntakeAgent {
  private readonly logger = new Logger(IntakeAgent.name);

  constructor(private readonly claudeService: ClaudeService) {}

  async run(input: IntakeAgentInput): Promise<AgentResult<IntakeAgentOutput>> {
    const startedAt = Date.now();

    try {
      const response = await this.claudeService.completeJson<IntakeAgentOutput>({
        model: MODEL,
        system: INTAKE_SYSTEM_PROMPT,
        maxTokens: 512,
        messages: [
          {
            role: 'user',
            content: `<caso>\n${input.textRedacted}\n</caso>`,
          },
        ],
      });

      const data = this.normalizeOutput(response.data, input);
      return {
        data,
        run: {
          agent: 'intake',
          model: MODEL,
          status: 'done',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            textLength: input.textRedacted.length,
            scenario: input.scenario,
            hasEntity: Boolean(input.entity),
          },
          outputSummary: {
            caseType: data.caseType,
            entitiesCount: data.entities.length,
            language: data.language,
            piiResidual: data.piiResidual,
            isRelevantCase: data.isRelevantCase,
          },
          tokenUsage: response.raw.usage,
        },
      };
    } catch (error) {
      this.logger.warn(`IntakeAgent fallback used: ${(error as Error).message}`);
      const data = this.fallback(input);
      return {
        data,
        run: {
          agent: 'intake',
          model: MODEL,
          status: 'warn',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            textLength: input.textRedacted.length,
            scenario: input.scenario,
            hasEntity: Boolean(input.entity),
          },
          outputSummary: {
            caseType: data.caseType,
            entitiesCount: data.entities.length,
            language: data.language,
            piiResidual: data.piiResidual,
            isRelevantCase: data.isRelevantCase,
            fallback: true,
          },
        },
      };
    }
  }

  private normalizeOutput(output: IntakeAgentOutput, input: IntakeAgentInput): IntakeAgentOutput {
    const allowedCaseTypes: CaseType[] = ['credito_trampa', 'app_estafa', 'galpon', 'atd_software', 'otro'];
    const allowedLanguages: IntakeAgentOutput['language'][] = ['es', 'kreyol', 'quechua', 'en'];

    return {
      caseType: allowedCaseTypes.includes(output.caseType) ? output.caseType : this.fallbackCaseType(input),
      entities: Array.isArray(output.entities) ? output.entities.filter(Boolean).slice(0, 5) : [],
      language: allowedLanguages.includes(output.language) ? output.language : this.fallbackLanguage(input),
      piiResidual: Boolean(output.piiResidual),
      isRelevantCase: typeof output.isRelevantCase === 'boolean' ? output.isRelevantCase : true,
    };
  }

  private fallback(input: IntakeAgentInput): IntakeAgentOutput {
    return {
      caseType: this.fallbackCaseType(input),
      entities: input.entity ? [input.entity] : [],
      language: this.fallbackLanguage(input),
      piiResidual: false,
      isRelevantCase: true,
    };
  }

  private fallbackCaseType(input: IntakeAgentInput): CaseType {
    const allowedCaseTypes: CaseType[] = ['credito_trampa', 'app_estafa', 'galpon', 'atd_software', 'otro'];
    return allowedCaseTypes.includes(input.scenario as CaseType) ? (input.scenario as CaseType) : 'otro';
  }

  private fallbackLanguage(input: IntakeAgentInput): IntakeAgentOutput['language'] {
    const allowedLanguages: IntakeAgentOutput['language'][] = ['es', 'kreyol', 'quechua', 'en'];
    return allowedLanguages.includes(input.language as IntakeAgentOutput['language'])
      ? (input.language as IntakeAgentOutput['language'])
      : 'es';
  }
}
