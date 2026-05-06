import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../claude/claude.service';
import {
  AgentResult,
  Citation,
  GoodPillarItem,
  LegalChunk,
  RiskPillarItem,
  RiskPillars,
  Severity,
  ValidatorAgentInput,
  ValidatorAgentOutput,
} from '../agent.types';
import { VALIDATOR_SYSTEM_PROMPT } from '../prompts/validator.prompt';

const MODEL = 'claude-haiku-4-5';

@Injectable()
export class ValidatorAgent {
  private readonly logger = new Logger(ValidatorAgent.name);

  constructor(private readonly claudeService: ClaudeService) {}

  async run(input: ValidatorAgentInput): Promise<AgentResult<ValidatorAgentOutput>> {
    const startedAt = Date.now();

    try {
      const response = await this.claudeService.completeJson<ValidatorAgentOutput>({
        model: MODEL,
        system: VALIDATOR_SYSTEM_PROMPT,
        maxTokens: 1500,
        messages: [
          {
            role: 'user',
            content: this.buildUserPrompt(input),
          },
        ],
      });

      const data = { pillars: this.validatePillars(response.data.pillars, input.chunks) };
      return {
        data,
        run: {
          agent: 'validator',
          model: MODEL,
          status: 'done',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            chunksCount: input.chunks.length,
            goodCount: input.pillars.good.length,
            badCount: input.pillars.bad.length,
            redCount: input.pillars.red.length,
          },
          outputSummary: {
            goodCount: data.pillars.good.length,
            badCount: data.pillars.bad.length,
            redCount: data.pillars.red.length,
          },
          tokenUsage: response.raw.usage,
        },
      };
    } catch (error) {
      this.logger.warn(`ValidatorAgent fallback used: ${(error as Error).message}`);
      const data = { pillars: this.validatePillars(input.pillars, input.chunks) };
      return {
        data,
        run: {
          agent: 'validator',
          model: MODEL,
          status: 'warn',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            chunksCount: input.chunks.length,
            goodCount: input.pillars.good.length,
            badCount: input.pillars.bad.length,
            redCount: input.pillars.red.length,
          },
          outputSummary: {
            goodCount: data.pillars.good.length,
            badCount: data.pillars.bad.length,
            redCount: data.pillars.red.length,
            fallback: true,
          },
        },
      };
    }
  }

  private buildUserPrompt(input: ValidatorAgentInput): string {
    return `<marco_legal>\n${this.formatLegalContext(input.chunks)}\n</marco_legal>\n\n<pillars>\n${JSON.stringify(input.pillars)}\n</pillars>`;
  }

  private formatLegalContext(chunks: LegalChunk[]): string {
    return chunks
      .map((chunk) => `[${chunk.ley} - ${chunk.articulo}]: ${chunk.text}\n[URL: ${chunk.url}]`)
      .join('\n\n');
  }

  private validatePillars(pillars: RiskPillars, chunks: LegalChunk[]): RiskPillars {
    return {
      good: this.validateGoodItems(Array.isArray(pillars?.good) ? pillars.good : [], chunks),
      bad: this.validateRiskItems(Array.isArray(pillars?.bad) ? pillars.bad : [], chunks),
      red: this.validateRiskItems(Array.isArray(pillars?.red) ? pillars.red : [], chunks),
    };
  }

  private validateGoodItems(items: GoodPillarItem[], chunks: LegalChunk[]): GoodPillarItem[] {
    return items
      .filter((item) => this.hasContent(item))
      .map((item) => ({
        title: String(item.title),
        detail: String(item.detail),
        citation: this.validCitation(item.citation, chunks),
      }));
  }

  private validateRiskItems(items: RiskPillarItem[], chunks: LegalChunk[]): RiskPillarItem[] {
    return items
      .filter((item) => this.hasContent(item))
      .map((item) => ({
        title: String(item.title),
        detail: String(item.detail),
        severity: this.normalizeSeverity(item.severity),
        citation: this.validCitation(item.citation, chunks),
      }));
  }

  private hasContent(item: { title?: string; detail?: string }): boolean {
    return Boolean(String(item?.title ?? '').trim() && String(item?.detail ?? '').trim());
  }

  private validCitation(citation: Citation | undefined, chunks: LegalChunk[]): Citation | undefined {
    if (!citation) return undefined;
    const found = chunks.find((chunk) => this.sameRef(chunk, citation));
    return found ? { ley: found.ley, articulo: found.articulo, url: found.url } : undefined;
  }

  private sameRef(chunk: LegalChunk, citation: Citation): boolean {
    return this.normalize(chunk.ley) === this.normalize(citation.ley)
      && this.normalize(chunk.articulo) === this.normalize(citation.articulo);
  }

  private normalizeSeverity(severity: Severity | undefined): Severity {
    return severity === 'Alto' || severity === 'Medio' || severity === 'Bajo' ? severity : 'Medio';
  }

  private normalize(value: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
}
