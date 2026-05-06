import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgentRunSummary } from './agent.types';
import { AgentRun, AgentRunDocument } from './schemas/agent-run.schema';

@Injectable()
export class AgentRunService {
  private readonly logger = new Logger(AgentRunService.name);

  constructor(
    @InjectModel(AgentRun.name)
    private readonly agentRunModel: Model<AgentRunDocument>,
  ) {}

  async create(analysisId: string, run: AgentRunSummary): Promise<AgentRunDocument | null> {
    try {
      return await this.agentRunModel.create({
        analysisId,
        agent: run.agent,
        model: run.model,
        status: run.status,
        durationMs: run.durationMs,
        inputSummary: this.sanitize(run.inputSummary ?? {}),
        outputSummary: this.sanitize(run.outputSummary ?? {}),
        tokenUsage: run.tokenUsage ?? {},
      });
    } catch (error) {
      this.logger.warn(`Agent run log failed for agent=${run.agent}: ${(error as Error).message}`);
      return null;
    }
  }

  async createMany(analysisId: string, runs: AgentRunSummary[]): Promise<void> {
    await Promise.all(runs.map((run) => this.create(analysisId, run)));
  }

  private sanitize(value: Record<string, unknown>): Record<string, unknown> {
    const blockedKeys = ['text', 'rawText', 'textRedacted', 'document', 'documentText'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      sanitized[key] = blockedKeys.includes(key) ? '[*_REDACTED]' : entry;
    }

    return sanitized;
  }
}
