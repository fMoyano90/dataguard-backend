import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgentRunSummary } from '../agents/agent.types';
import { IntakeAgent } from '../agents/services/intake.agent';
import { RecommendationAgent } from '../agents/services/recommendation.agent';
import { RegulatoryContextAgent } from '../agents/services/regulatory-context.agent';
import { RiskAnalysisAgent } from '../agents/services/risk-analysis.agent';
import { ValidatorAgent } from '../agents/services/validator.agent';
import { AgentRun, AgentRunDocument } from '../agents/schemas/agent-run.schema';
import { AuditLogService } from '../audit/audit-log.service';
import { ClaudeService, DocumentMediaType } from '../claude/claude.service';
import { PiiValidationService } from '../pii/pii-validation.service';
import { ReportService } from '../reports/report.service';
import { AnalysisResultDto } from './dto/analysis-result.dto';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { ExtractDocumentResultDto } from './dto/extract-document-result.dto';
import { Analysis, AnalysisDocument } from './schemas/analysis.schema';

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<AnalysisDocument>,
    @InjectModel(AgentRun.name)
    private readonly agentRunModel: Model<AgentRunDocument>,
    private readonly piiValidationService: PiiValidationService,
    private readonly auditLogService: AuditLogService,
    private readonly reportService: ReportService,
    private readonly claudeService: ClaudeService,
    private readonly intakeAgent: IntakeAgent,
    private readonly regulatoryContextAgent: RegulatoryContextAgent,
    private readonly riskAnalysisAgent: RiskAnalysisAgent,
    private readonly recommendationAgent: RecommendationAgent,
    private readonly validatorAgent: ValidatorAgent,
  ) {}

  async run(dto: CreateAnalysisDto): Promise<AnalysisResultDto> {
    const redaction = this.piiValidationService.redact(dto.text);
    const contextRedaction = dto.caseContext?.trim()
      ? this.piiValidationService.redact(dto.caseContext)
      : null;
    const caseContextRedacted = contextRedaction?.text ?? undefined;
    const started = await this.analysisModel.create({
      scenario: dto.scenario,
      language: dto.language,
      entity: dto.entity,
      documentType: dto.documentType,
      textRedacted: redaction.text,
      riskScore: 0,
      riskLabel: 'Bajo',
      resultTitle: 'Analisis iniciado',
      resultText: 'Analisis iniciado',
      pillars: { good: [], bad: [], red: [] },
      plan: [],
      letters: {},
      sources: [],
      meta: {
        processedAt: new Date().toISOString(),
        zeroStorage: true,
        piiRedacted: redaction.piiRedacted,
        mocked: true,
      },
    });

    const analysisId = String(started._id);
    await this.auditLogService.log({
      type: 'analysis_started',
      analysisId,
      details: {
        scenario: dto.scenario,
        entity: dto.entity,
        documentType: dto.documentType,
        piiRedacted: redaction.piiRedacted,
        piiFindings: redaction.found,
        hasCaseContext: Boolean(caseContextRedacted),
        caseContextPiiRedacted: contextRedaction?.piiRedacted ?? false,
      },
    });

    const agentRuns: AgentRunSummary[] = [];
    let warnCount = 0;

    const intake = await this.intakeAgent.run({
      textRedacted: redaction.text,
      scenario: dto.scenario,
      entity: dto.entity,
      language: dto.language,
      caseContextRedacted,
    });
    agentRuns.push(intake.run);
    if (intake.run.status === 'warn') warnCount += 1;
    await this.logAgentRun(analysisId, 'intake', intake.run.status, intake.data as unknown as Record<string, unknown>);

    const regulatory = await this.regulatoryContextAgent.run({
      textRedacted: redaction.text,
      caseType: intake.data.caseType,
      entity: dto.entity,
      topK: 5,
    });
    agentRuns.push(regulatory.run);
    if (regulatory.run.status === 'warn') warnCount += 1;
    await this.logAgentRun(analysisId, 'regulatory', regulatory.run.status, {
      source: regulatory.data.source,
      chunks: regulatory.data.chunks.length,
    });

    const risk = await this.riskAnalysisAgent.run({
      textRedacted: redaction.text,
      caseType: intake.data.caseType,
      entity: dto.entity,
      chunks: regulatory.data.chunks,
      caseContextRedacted,
    });
    agentRuns.push(risk.run);
    if (risk.run.status === 'warn') warnCount += 1;
    await this.logAgentRun(analysisId, 'risk', risk.run.status, {
      riskScore: risk.data.riskScore,
      riskLabel: risk.data.riskLabel,
    });

    const recommendation = await this.recommendationAgent.run({
      textRedacted: redaction.text,
      caseType: intake.data.caseType,
      entity: dto.entity,
      pillars: risk.data.pillars,
      caseContextRedacted,
    });
    agentRuns.push(recommendation.run);
    if (recommendation.run.status === 'warn') warnCount += 1;
    await this.logAgentRun(analysisId, 'recommendation', recommendation.run.status, {
      planCount: recommendation.data.plan.length,
      hasBankLetter: Boolean(recommendation.data.letters.bank),
      hasSernacLetter: Boolean(recommendation.data.letters.sernac),
    });

    const validator = await this.validatorAgent.run({
      chunks: regulatory.data.chunks,
      pillars: risk.data.pillars,
    });
    agentRuns.push(validator.run);
    if (validator.run.status === 'warn') warnCount += 1;
    await this.logAgentRun(analysisId, 'validator', validator.run.status, {
      goodCount: validator.data.pillars.good.length,
      badCount: validator.data.pillars.bad.length,
      redCount: validator.data.pillars.red.length,
    });

    const validatedPillars = validator.data.pillars;
    const isMocked = warnCount >= 2;

    if (isMocked) {
      this.logger.warn(`[MOCK] ${warnCount} agents returned warn, falling back to fixture for analysisId=${analysisId}`);
      const fixture = this.reportService.assembleFixture(dto, analysisId, redaction.piiRedacted);
      fixture.agentRuns = this.mergeAgentRuns(agentRuns, fixture.agentRuns);
      await this.persistResult(analysisId, fixture, redaction.text);
      await this.persistAgentRuns(analysisId, fixture);
      await this.auditLogService.log({
        type: 'analysis_completed',
        analysisId,
        details: {
          scenario: fixture.scenario,
          riskScore: fixture.riskScore,
          riskLabel: fixture.riskLabel,
          mocked: true,
          warnCount,
        },
      });
      return fixture;
    }

    const result: AnalysisResultDto = {
      id: analysisId,
      scenario: intake.data.caseType as AnalysisResultDto['scenario'],
      riskScore: risk.data.riskScore,
      riskLabel: risk.data.riskLabel,
      resultTitle: risk.data.resultTitle,
      resultText: risk.data.resultText,
      pillars: {
        good: validatedPillars.good.map((item) => ({
          title: item.title,
          detail: item.detail,
          citation: item.citation,
        })),
        bad: validatedPillars.bad.map((item) => ({
          title: item.title,
          detail: item.detail,
          severity: item.severity,
          citation: item.citation,
        })),
        red: validatedPillars.red.map((item) => ({
          title: item.title,
          detail: item.detail,
          severity: item.severity,
          citation: item.citation,
        })),
      },
      plan: recommendation.data.plan,
      letters: recommendation.data.letters,
      sources: this.buildSources(regulatory.data.chunks),
      agentRuns: agentRuns.map((run) => ({
        agent: run.agent as AnalysisResultDto['agentRuns'][number]['agent'],
        model: run.model,
        durationMs: run.durationMs,
        status: run.status,
      })),
      meta: {
        processedAt: new Date().toISOString(),
        zeroStorage: true,
        piiRedacted: redaction.piiRedacted,
        mocked: false,
        tokenUsage: this.collectTokenUsage(agentRuns),
      },
    };

    await this.persistResult(analysisId, result, redaction.text);
    await this.persistAgentRuns(analysisId, result);
    await this.auditLogService.log({
      type: 'analysis_completed',
      analysisId,
      details: {
        scenario: result.scenario,
        riskScore: result.riskScore,
        riskLabel: result.riskLabel,
        mocked: false,
        warnCount,
      },
    });

    return result;
  }

  async extractDocument(file: Express.Multer.File): Promise<ExtractDocumentResultDto> {
    const startedAt = Date.now();
    const mediaType = file.mimetype as DocumentMediaType;

    let extracted;
    try {
      extracted = await this.claudeService.extractTextFromDocument({
        buffer: file.buffer,
        mediaType,
      });
    } catch (error) {
      this.logger.warn(`extractDocument failed: ${(error as Error).message}`);
      throw new BadRequestException(
        'No fue posible leer el documento. Verifica que el archivo no este corrupto y vuelve a intentarlo.',
      );
    }

    const rawText = (extracted.text ?? '').trim();
    if (!rawText || rawText === 'VACIO') {
      throw new BadRequestException(
        'No se detecto texto en el documento. Sube una version mas legible o pega el contenido manualmente.',
      );
    }

    const redaction = this.piiValidationService.redact(rawText);

    await this.auditLogService.log({
      type: 'document_extracted',
      details: {
        mimetype: file.mimetype,
        sizeBytes: file.size,
        charCount: redaction.text.length,
        piiRedacted: redaction.piiRedacted,
        piiFindings: redaction.found,
        model: extracted.model,
        durationMs: Date.now() - startedAt,
        tokenUsage: extracted.usage,
      },
    });

    return {
      text: redaction.text,
      charCount: redaction.text.length,
      piiRedacted: redaction.piiRedacted,
      mimetype: file.mimetype,
      model: extracted.model,
    };
  }

  async findById(id: string): Promise<AnalysisResultDto> {
    const analysis = await this.analysisModel.findById(id).lean();
    if (!analysis) {
      throw new NotFoundException('analysis not found');
    }

    const agentRuns = await this.agentRunModel
      .find({ analysisId: id })
      .sort({ createdAt: 1 })
      .lean();

    return {
      id,
      scenario: analysis.scenario as AnalysisResultDto['scenario'],
      riskScore: analysis.riskScore,
      riskLabel: analysis.riskLabel as AnalysisResultDto['riskLabel'],
      resultTitle: analysis.resultTitle,
      resultText: analysis.resultText,
      pillars: analysis.pillars as AnalysisResultDto['pillars'],
      plan: analysis.plan,
      letters: analysis.letters,
      sources: analysis.sources as AnalysisResultDto['sources'],
      agentRuns: agentRuns.map((run) => ({
        agent: run.agent as AnalysisResultDto['agentRuns'][number]['agent'],
        model: run.model,
        durationMs: run.durationMs,
        status: run.status,
      })),
      meta: analysis.meta as AnalysisResultDto['meta'],
    };
  }

  private async persistResult(analysisId: string, result: AnalysisResultDto, textRedacted: string) {
    await this.analysisModel.findByIdAndUpdate(analysisId, {
      scenario: result.scenario,
      textRedacted,
      riskScore: result.riskScore,
      riskLabel: result.riskLabel,
      resultTitle: result.resultTitle,
      resultText: result.resultText,
      pillars: result.pillars,
      plan: result.plan,
      letters: result.letters,
      sources: result.sources,
      meta: result.meta,
    });
  }

  private async persistAgentRuns(analysisId: string, result: AnalysisResultDto) {
    await this.agentRunModel.deleteMany({ analysisId });
    await this.agentRunModel.insertMany(
      result.agentRuns.map((run) => ({
        analysisId,
        agent: run.agent,
        model: run.model,
        status: run.status,
        durationMs: run.durationMs,
        inputSummary: { scenario: result.scenario },
        outputSummary: { mocked: result.meta.mocked },
        tokenUsage: result.meta.tokenUsage ?? {},
      })),
    );
  }

  private mergeAgentRuns(
    realRuns: AgentRunSummary[],
    fixtureRuns: AnalysisResultDto['agentRuns'],
  ): AnalysisResultDto['agentRuns'] {
    const realAgentNames = new Set(realRuns.map((run) => run.agent));
    return [
      ...realRuns.map((run) => ({
        agent: run.agent as AnalysisResultDto['agentRuns'][number]['agent'],
        model: run.model,
        durationMs: run.durationMs,
        status: run.status,
      })),
      ...fixtureRuns.filter((run) => !realAgentNames.has(run.agent)),
    ];
  }

  private buildSources(chunks: Array<{ ley: string; articulo: string; url: string; mocked?: boolean }>): AnalysisResultDto['sources'] {
    const seen = new Set<string>();
    return chunks
      .filter((chunk) => {
        const key = `${chunk.ley}:${chunk.articulo}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((chunk) => ({
        name: `${chunk.ley} ${chunk.articulo}`,
        type: chunk.mocked ? 'mock' as const : 'legal' as const,
        url: chunk.url,
      }));
  }

  private collectTokenUsage(runs: AgentRunSummary[]): Record<string, unknown> {
    const usage: Record<string, unknown> = {};
    for (const run of runs) {
      if (run.tokenUsage) {
        usage[run.agent] = run.tokenUsage;
      }
    }
    return usage;
  }

  private async logAgentRun(analysisId: string, agent: string, status: string, details: Record<string, any>) {
    await this.auditLogService.log({
      type: 'agent_run_completed',
      analysisId,
      details: { agent, status, ...details },
    });
  }
}
