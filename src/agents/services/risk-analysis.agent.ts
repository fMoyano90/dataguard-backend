import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../claude/claude.service';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import {
  AgentResult,
  Citation,
  LegalChunk,
  RiskAnalysisAgentInput,
  RiskAnalysisAgentOutput,
  RiskLabel,
  RiskPillars,
  Severity,
} from '../agent.types';
import { RISK_SYSTEM_PROMPT } from '../prompts/risk.prompt';

const MODEL = 'claude-sonnet-4-6';
const ALLOWED_TOOLS = new Set([
  'search_pinecone_legal',
  'check_cmf_imitator',
  'check_phishtank_url',
  'explain_law_simple',
  'check_usury_rate',
  'detect_open_finance_clause',
  'check_atd_in_contract',
]);

@Injectable()
export class RiskAnalysisAgent {
  private readonly logger = new Logger(RiskAnalysisAgent.name);

  constructor(
    private readonly claudeService: ClaudeService,
    private readonly toolRegistryService: ToolRegistryService,
  ) {}

  async run(input: RiskAnalysisAgentInput): Promise<AgentResult<RiskAnalysisAgentOutput>> {
    const startedAt = Date.now();

    try {
      const response = await this.claudeService.completeWithTools({
        model: MODEL,
        system: RISK_SYSTEM_PROMPT,
        maxTokens: 4000,
        tools: this.toolRegistryService.toAnthropicTools().filter((tool) => ALLOWED_TOOLS.has(tool.name)),
        messages: [
          {
            role: 'user',
            content: this.buildUserPrompt(input),
          },
        ],
        runTool: (name, toolInput) => this.toolRegistryService.runAsClaudeTool(name, toolInput),
      });

      const data = this.normalizeOutput(this.parseJson(response.text), input);
      return {
        data,
        run: {
          agent: 'risk',
          model: MODEL,
          status: 'done',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            caseType: input.caseType,
            hasEntity: Boolean(input.entity),
            hasCaseContext: Boolean(input.caseContextRedacted?.trim()),
            chunksCount: input.chunks.length,
            textLength: input.textRedacted.length,
          },
          outputSummary: {
            riskScore: data.riskScore,
            riskLabel: data.riskLabel,
            goodCount: data.pillars.good.length,
            badCount: data.pillars.bad.length,
            redCount: data.pillars.red.length,
          },
          tokenUsage: response.usage,
        },
      };
    } catch (error) {
      this.logger.warn(`RiskAnalysisAgent fallback used: ${(error as Error).message}`);
      const data = this.fallback(input);
      return {
        data,
        run: {
          agent: 'risk',
          model: MODEL,
          status: 'warn',
          durationMs: Date.now() - startedAt,
          inputSummary: {
            caseType: input.caseType,
            hasEntity: Boolean(input.entity),
            hasCaseContext: Boolean(input.caseContextRedacted?.trim()),
            chunksCount: input.chunks.length,
            textLength: input.textRedacted.length,
          },
          outputSummary: {
            riskScore: data.riskScore,
            riskLabel: data.riskLabel,
            fallback: true,
          },
        },
      };
    }
  }

  private buildUserPrompt(input: RiskAnalysisAgentInput): string {
    const contextoUsuario = input.caseContextRedacted?.trim()
      ? `\n\n<contexto_usuario>\n${input.caseContextRedacted.trim()}\n</contexto_usuario>`
      : '';
    return `<marco_legal>\n${this.formatLegalContext(input.chunks)}\n</marco_legal>\n\n<entidad>${input.entity ?? 'No informada'}</entidad>\n<tipo_caso>${input.caseType}</tipo_caso>${contextoUsuario}\n\n<caso>\n${input.textRedacted}\n</caso>`;
  }

  private formatLegalContext(chunks: LegalChunk[]): string {
    return chunks
      .map((chunk) => `[${chunk.ley} - ${chunk.articulo}${chunk.tema ? ` (${chunk.tema})` : ''}]: ${chunk.text}\n[URL: ${chunk.url}]`)
      .join('\n\n');
  }

  private parseJson(text: string): RiskAnalysisAgentOutput {
    const extracted = this.extractJson(text);
    if (!extracted) {
      throw new Error(`No JSON found in risk analysis response: ${text.slice(0, 100)}`);
    }
    return JSON.parse(extracted) as RiskAnalysisAgentOutput;
  }

  private extractJson(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;

    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }

    return null;
  }

  private normalizeOutput(output: RiskAnalysisAgentOutput, input: RiskAnalysisAgentInput): RiskAnalysisAgentOutput {
    const riskScore = Math.max(0, Math.min(100, Number(output.riskScore) || 0));
    const pillars = this.normalizePillars(output.pillars, input.chunks);
    return {
      riskScore,
      riskLabel: this.normalizeRiskLabel(output.riskLabel, riskScore),
      resultTitle: String(output.resultTitle || this.fallback(input).resultTitle),
      resultText: String(output.resultText || this.fallback(input).resultText),
      pillars,
    };
  }

  private normalizePillars(pillars: RiskPillars, chunks: LegalChunk[]): RiskPillars {
    return {
      good: Array.isArray(pillars?.good) ? pillars.good.map((item) => ({
        title: String(item.title ?? 'Punto a favor'),
        detail: String(item.detail ?? ''),
        citation: this.validCitation(item.citation, chunks),
      })) : [],
      bad: Array.isArray(pillars?.bad) ? pillars.bad.map((item) => ({
        title: String(item.title ?? 'Riesgo detectado'),
        detail: String(item.detail ?? ''),
        severity: this.normalizeSeverity(item.severity),
        citation: this.validCitation(item.citation, chunks),
      })) : [],
      red: Array.isArray(pillars?.red) ? pillars.red.map((item) => ({
        title: String(item.title ?? 'Alerta roja'),
        detail: String(item.detail ?? ''),
        severity: this.normalizeSeverity(item.severity),
        citation: this.validCitation(item.citation, chunks),
      })) : [],
    };
  }

  private validCitation(citation: Citation | undefined, chunks: LegalChunk[]): Citation | undefined {
    if (!citation) return undefined;
    const found = chunks.find((chunk) => chunk.ley === citation.ley && chunk.articulo === citation.articulo);
    return found ? { ley: found.ley, articulo: found.articulo, url: found.url } : undefined;
  }

  private normalizeRiskLabel(label: RiskLabel | undefined, score: number): RiskLabel {
    const allowed: RiskLabel[] = ['Bajo', 'Medio', 'Medio-alto', 'Alto'];
    if (label && allowed.includes(label)) return label;
    if (score >= 75) return 'Alto';
    if (score >= 55) return 'Medio-alto';
    if (score >= 30) return 'Medio';
    return 'Bajo';
  }

  private normalizeSeverity(severity: Severity | undefined): Severity {
    return severity === 'Alto' || severity === 'Medio' || severity === 'Bajo' ? severity : 'Medio';
  }

  private fallback(input: RiskAnalysisAgentInput): RiskAnalysisAgentOutput {
    const firstCitation = this.citationFromChunk(input.chunks[0]);
    const secondCitation = this.citationFromChunk(input.chunks[1] ?? input.chunks[0]);
    const riskScore = input.caseType === 'app_estafa' ? 82 : input.caseType === 'credito_trampa' ? 70 : 55;

    return {
      riskScore,
      riskLabel: this.normalizeRiskLabel(undefined, riskScore),
      resultTitle: 'Caso con riesgos que conviene revisar antes de avanzar',
      resultText: 'Hay senales que pueden afectar tus datos o tu bolsillo. Revisa los puntos marcados y pide cambios antes de firmar o entregar informacion.',
      pillars: {
        good: [
          {
            title: 'Hay base legal para pedir explicaciones',
            detail: 'Puedes exigir informacion clara sobre como usaran tus datos o que condiciones estas aceptando.',
            citation: firstCitation,
          },
        ],
        bad: [
          {
            title: 'Condiciones poco claras para el usuario',
            detail: 'El texto requiere una revision humana porque puede incluir permisos amplios o condiciones dificiles de entender.',
            severity: 'Medio',
            citation: secondCitation,
          },
        ],
        red: input.caseType === 'app_estafa'
          ? [
              {
                title: 'No entregues datos ni pagues anticipos',
                detail: 'Si la entidad no esta verificada, hay riesgo de estafa o uso indebido de tus datos.',
                severity: 'Alto',
                citation: firstCitation,
              },
            ]
          : [],
      },
    };
  }

  private citationFromChunk(chunk: LegalChunk | undefined): Citation | undefined {
    if (!chunk) return undefined;
    return { ley: chunk.ley, articulo: chunk.articulo, url: chunk.url };
  }
}
