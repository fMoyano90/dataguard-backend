import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface AuditLogInput {
  type: string;
  analysisId?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(input: AuditLogInput): Promise<AuditLogDocument | null> {
    try {
      return await this.auditLogModel.create({
        type: input.type,
        analysisId: input.analysisId,
        details: this.sanitizeDetails(input.details ?? {}),
      });
    } catch (error) {
      this.logger.warn(`Audit log failed for type=${input.type}: ${(error as Error).message}`);
      return null;
    }
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const blockedKeys = ['rut', 'email', 'phone', 'text', 'rawText', 'document', 'documentText'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (blockedKeys.includes(key)) {
        sanitized[key] = '[*_REDACTED]';
        continue;
      }
      sanitized[key] = value;
    }

    return sanitized;
  }
}
