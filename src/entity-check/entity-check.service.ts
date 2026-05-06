import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit/audit-log.service';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { EntityCheckDto } from './dto/entity-check.dto';
import { EntityCheckResultDto, PhishTankResultDto } from './dto/entity-check-result.dto';

@Injectable()
export class EntityCheckService {
  constructor(
    private readonly toolRegistryService: ToolRegistryService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async check(dto: EntityCheckDto): Promise<EntityCheckResultDto> {
    if (!dto.name && !dto.url) {
      throw new BadRequestException('name or url is required');
    }

    const [entityResult, phishtank] = await Promise.all([
      dto.name ? this.checkEntityName(dto.name) : Promise.resolve(this.emptyEntityResult()),
      dto.url ? this.checkUrl(dto.url) : Promise.resolve(undefined),
    ]);

    const result = this.mergeResults(entityResult, phishtank, dto);
    await this.auditLogService.log({
      type: 'entity_check',
      details: {
        name: dto.name,
        hasUrl: Boolean(dto.url),
        registered: result.registered,
        isImitator: result.isImitator,
        source: result.source,
        mocked: result._mocked,
        phishtank: phishtank
          ? {
              in_database: phishtank.in_database,
              verified: phishtank.verified,
              valid_phish: phishtank.valid_phish,
            }
          : undefined,
      },
    });

    return result;
  }

  private async checkEntityName(name: string): Promise<EntityCheckResultDto> {
    return this.toolRegistryService.runAsClaudeTool('check_cmf_imitator', { name }) as Promise<EntityCheckResultDto>;
  }

  private async checkUrl(url: string): Promise<PhishTankResultDto> {
    return this.toolRegistryService.runAsClaudeTool('check_phishtank_url', { url }) as Promise<PhishTankResultDto>;
  }

  private emptyEntityResult(): EntityCheckResultDto {
    return {
      registered: false,
      isImitator: false,
      source: 'PhishTank',
      evidence: 'Solo se verifico URL sospechosa.',
      _mocked: false,
    };
  }

  private mergeResults(
    entityResult: EntityCheckResultDto,
    phishtank: PhishTankResultDto | undefined,
    dto: EntityCheckDto,
  ): EntityCheckResultDto {
    const isPhishing = Boolean(phishtank?.valid_phish || phishtank?.verified);
    const sourceParts = [entityResult.source];
    if (phishtank) sourceParts.push('PhishTank');

    return {
      ...entityResult,
      name: dto.name ?? entityResult.name,
      isImitator: entityResult.isImitator || isPhishing,
      source: sourceParts.join(' + '),
      evidence: this.buildEvidence(entityResult.evidence, phishtank),
      phishtank,
      _mocked: entityResult._mocked,
    };
  }

  private buildEvidence(entityEvidence?: string, phishtank?: PhishTankResultDto): string | undefined {
    const parts = [];
    if (entityEvidence) parts.push(entityEvidence);
    if (phishtank) {
      parts.push(
        phishtank.valid_phish || phishtank.verified
          ? 'PhishTank marca la URL como sospechosa o verificada.'
          : 'PhishTank no marca la URL como phishing verificado.',
      );
    }
    return parts.length > 0 ? parts.join(' ') : undefined;
  }
}
